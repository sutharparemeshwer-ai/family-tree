import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, { 
  Controls, 
  Background, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  ConnectionLineType,
  useReactFlow,
  ReactFlowProvider,
  Panel
} from 'reactflow';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import 'reactflow/dist/style.css';

import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import AddMemberForm from '../components/AddMemberForm';
import ActionBar from '../components/ActionBar';
import ShareModal from '../components/ShareModal';
import FamilyNode from '../components/FamilyNode';
import ConfirmationModal from '../components/ConfirmationModal'; // Import ConfirmationModal
import api, { SERVER_URL } from '../utils/api';
import { getLayoutedElements } from '../utils/treeLayout';
import { generateFamilyBook } from '../utils/bookGenerator';
import './Tree.css';

const nodeTypes = {
  familyMember: FamilyNode,
};

const defaultEdgeOptions = {
  animated: true,
  style: { strokeWidth: 2, stroke: '#81c784' },
  type: ConnectionLineType.SmoothStep,
  markerEnd: {
    type: 'arrowclosed',
    color: '#81c784',
  },
};

// Internal component to use ReactFlow hooks
const TreeVisualizer = ({ familyMembers, serverUrl, onAddRelative, onEdit, onDelete, user }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView, setCenter } = useReactFlow();
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [highlightedId, setHighlightedId] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // 1. Initial Layout Calculation
  useEffect(() => {
    if (familyMembers.length > 0) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(familyMembers);

      const initialNodes = layoutedNodes.map((node) => {
        if (node.type === 'familyMember') {
          return {
            ...node,
            data: { 
              ...node.data, 
              serverUrl, 
              onAddRelative,
              onEdit,   // Pass edit handler
              onDelete, // Pass delete handler
              isHighlighted: false
            },
            style: {} 
          };
        }
        return node;
      });

      setNodes(initialNodes);
      setEdges(layoutedEdges);
      
      setTimeout(() => fitView({ padding: 0.2 }), 50);
    } else {
        setNodes([]);
        setEdges([]);
    }
  }, [familyMembers, serverUrl, onAddRelative, onEdit, onDelete, setNodes, setEdges, fitView]);

  // 2. Handle Highlighting
  useEffect(() => {
    setNodes((nds) => 
      nds.map((node) => {
        if (node.type === 'familyMember') {
          return {
            ...node,
            data: {
              ...node.data,
              isHighlighted: node.id === highlightedId,
            },
            style: {}, 
          };
        }
        return node;
      })
    );
  }, [highlightedId, setNodes]);

  // Handle Search Input
  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim()) {
      const results = familyMembers.filter(member => 
        `${member.first_name} ${member.last_name || ''}`.toLowerCase().includes(query.toLowerCase()) ||
        (member.nickname && member.nickname.toLowerCase().includes(query.toLowerCase()))
      );
      setSearchResults(results.slice(0, 5));
    } else {
      setSearchResults([]);
    }
  };

  // Fly To Member
  const flyToMember = (member) => {
    const node = nodes.find(n => n.id === member.id.toString());
    if (node) {
      const x = node.position.x + (node.width / 2 || 0);
      const y = node.position.y + (node.height / 2 || 0);

      setCenter(x, y, { zoom: 1.5, duration: 800 });
      setHighlightedId(member.id.toString());
      setSearchQuery('');
      setSearchResults([]);
      setIsSearchOpen(false); // Close search after selection
    }
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.1}
      attributionPosition="bottom-right"
      onPaneClick={() => setHighlightedId(null)}
      defaultEdgeOptions={defaultEdgeOptions}
      connectionLineType={ConnectionLineType.SmoothStep}
    >
      <Controls className="react-flow-controls" />
      <MiniMap 
        nodeStrokeColor={(n) => {
          if (n.type === 'familyMember') return 'var(--primary-color)';
          return 'var(--bg-light)';
        }} 
        nodeColor="var(--primary-light)"
        maskColor="rgba(255, 255, 255, 0.2)"
        className="react-flow-minimap"
      />
      <Background className="react-flow-background" />
      
      <Panel position="top-center" className="tree-title-overlay">
        {user?.first_name ? `${user.first_name}'s` : 'My'} Family Lineage
      </Panel>

      <Panel position="top-left" style={{ top: 110 }} className="search-panel">
        <div className={`search-container ${isSearchOpen ? 'open' : ''}`}>
          <button 
            className="search-toggle-btn" 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            title={isSearchOpen ? "Close Search" : "Search Family"}
          >
             {isSearchOpen ? (
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
             )}
          </button>
          
          <div className="search-input-wrapper">
             <input 
              type="text" 
              placeholder="Search family..." 
              value={searchQuery}
              onChange={handleSearch}
              className="search-input"
            />
          </div>

          {isSearchOpen && searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map(result => (
                <div 
                  key={result.id} 
                  className="search-result-item"
                  onClick={() => flyToMember(result)}
                >
                  <div className="result-name">{result.first_name} {result.last_name}</div>
                  {result.nickname && <div className="result-nick">({result.nickname})</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>
    </ReactFlow>
  );
};

const Tree = () => {
  const [user, setUser] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  
  // Edit & Add State
  const [relationType, setRelationType] = useState('');
  const [relativeToId, setRelativeToId] = useState(null);
  const [editingMember, setEditingMember] = useState(null); // Track member being edited

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  const [loadingMembers, setLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Preview State (Interactive Mode)
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const serverUrl = SERVER_URL;

  const fetchFamilyMembers = useCallback(async () => {
    setLoadingMembers(true);
    setMembersError('');
    try {
      const response = await api.get('/members');
      setFamilyMembers(response.data);
    } catch (err) {
      console.error('Error fetching family members:', err);
      setMembersError('Failed to load family members.');
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      fetchFamilyMembers();
    }
  }, [fetchFamilyMembers]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 2000); // Increased timeout for visibility
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleAddRelative = useCallback((type, targetMemberId) => {
    setRelationType(type);
    setRelativeToId(targetMemberId);
    setEditingMember(null); // Ensure we are not editing
    setModalOpen(true);
    setSuccessMessage('');
  }, []);

  const handleAddSelf = () => {
    setRelationType('Self');
    setRelativeToId(null);
    setEditingMember(null);
    setModalOpen(true);
    setSuccessMessage('');
  };

  const handleEditMember = useCallback((member) => {
    setEditingMember(member);
    setModalOpen(true);
    setSuccessMessage('');
  }, []);

  const handleDeleteRequest = useCallback((memberId) => {
    setMemberToDelete(memberId);
    setIsDeleteModalOpen(true);
  }, []);

  const confirmDelete = async () => {
    if (!memberToDelete) return;
    try {
      await api.delete(`/members/${memberToDelete}`);
      setSuccessMessage('Member deleted successfully.');
      setIsDeleteModalOpen(false);
      setMemberToDelete(null);
      await fetchFamilyMembers(); // Refresh tree
    } catch (err) {
      console.error('Failed to delete member:', err);
      setMembersError('Failed to delete member.');
      setIsDeleteModalOpen(false);
    }
  };

  const handleMemberSaved = async (message) => {
    setModalOpen(false);
    setSuccessMessage(message || 'Operation successful!');
    await fetchFamilyMembers();
  };

  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
    if (!isPreviewMode) {
      setSuccessMessage('Entered Preview Mode');
    } else {
      setSuccessMessage('Exited Preview Mode');
    }
  };

  const handleDownload = async () => {
    const flowElement = document.querySelector('.react-flow');
    if (flowElement) {
      flowElement.classList.add('printing-mode');
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const dataUrl = await toPng(flowElement, {
          filter: (node) => {
            return (
              !node.classList?.contains('react-flow__controls') &&
              !node.classList?.contains('react-flow__minimap') &&
              !node.classList?.contains('action-bar') &&
              !node.classList?.contains('tree-title-overlay') &&
              !node.classList?.contains('search-panel')
            );
          },
          backgroundColor: '#f5f7fa',
          pixelRatio: 3,
          style: { width: '100%', height: '100%' }
        });
        download(dataUrl, 'my-family-tree.png');
      } catch (err) {
        console.error('Download failed', err);
      } finally {
        flowElement.classList.remove('printing-mode');
      }
    }
  };

  const handleGenerateBook = async () => {
    setSuccessMessage('Generating Family Book... Please wait.');
    const flowElement = document.querySelector('.react-flow');
    if (flowElement) {
      flowElement.classList.add('printing-mode');
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const treeImageBase64 = await toPng(flowElement, {
          filter: (node) => {
            return (
              !node.classList?.contains('react-flow__controls') &&
              !node.classList?.contains('react-flow__minimap') &&
              !node.classList?.contains('action-bar') &&
              !node.classList?.contains('tree-title-overlay') &&
              !node.classList?.contains('search-panel')
            );
          },
          backgroundColor: '#f5f7fa',
          pixelRatio: 2,
          style: { width: '100%', height: '100%' }
        });
        await generateFamilyBook(familyMembers, treeImageBase64, user, serverUrl);
        setSuccessMessage('Family Book generated successfully!');
      } catch (err) {
        console.error('Error generating book:', err);
        setMembersError('Failed to generate book.');
      } finally {
        flowElement.classList.remove('printing-mode');
      }
    }
  };

  return (
    <div className={`tree-page-container ${isPreviewMode ? 'preview-mode' : ''}`}>
      {!isPreviewMode && <Navbar />}
      
      {familyMembers.length > 0 && (
        <ActionBar 
          onDownload={handleDownload} 
          onShare={() => setShareModalOpen(true)} 
          onGenerateBook={handleGenerateBook}
          onPreview={togglePreview}
          isPreviewMode={isPreviewMode}
        />
      )}

      <div className="tree-content" style={{ height: isPreviewMode ? '100vh' : 'calc(100vh - 80px)', width: '100%' }}>
        {loadingMembers && <div className="loading-overlay">Loading family tree...</div>}
        {membersError && <p className="error-message">{membersError}</p>}
        {successMessage && <div className="success-toast">{successMessage}</div>}
        
        {!loadingMembers && !membersError && (
          <>
            {familyMembers.length === 0 ? (
              <div className="add-self-prompt">
                <p>Start your family tree!</p>
                <button className="hero-cta-btn" onClick={handleAddSelf}>Add Myself</button>
              </div>
            ) : (
              <div style={{ width: '100%', height: '100%' }}>
                <ReactFlowProvider>
                  <TreeVisualizer 
                    familyMembers={familyMembers}
                    serverUrl={serverUrl}
                    onAddRelative={handleAddRelative}
                    onEdit={handleEditMember} // Pass edit handler
                    onDelete={handleDeleteRequest} // Pass delete handler
                    user={user}
                  />
                </ReactFlowProvider>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reused Modal for Adding and Editing */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <AddMemberForm
          relationType={relationType}
          onCancel={() => setModalOpen(false)}
          relativeToId={relativeToId}
          onMemberAdded={handleMemberSaved}
          editingMember={editingMember} // Pass member to edit
        />
      </Modal>

      <ShareModal 
        isOpen={shareModalOpen} 
        onClose={() => setShareModalOpen(false)} 
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Member?"
        message="Are you sure you want to delete this family member? This might affect relationships in your tree."
      />
    </div>
  );
};

export default Tree;