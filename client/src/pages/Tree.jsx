import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactFlow, { 
  Controls, 
  Background, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  addEdge,
  ConnectionLineType,
  useReactFlow,
  ReactFlowProvider,
  Panel // Import Panel here
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
import api from '../utils/api';
import { getLayoutedElements } from '../utils/treeLayout';
import { generateFamilyBook } from '../utils/bookGenerator';
import './Tree.css';

const nodeTypes = {
  familyMember: FamilyNode,
};

// Internal component to use ReactFlow hooks
const TreeVisualizer = ({ familyMembers, serverUrl, onAddRelative, user }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView, setCenter, zoomTo } = useReactFlow();
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [highlightedId, setHighlightedId] = useState(null);

  // 1. Initial Layout Calculation (Run only when family members change)
  useEffect(() => {
    if (familyMembers.length > 0) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(familyMembers);

      // Initialize nodes with base data
      const initialNodes = layoutedNodes.map((node) => {
        if (node.type === 'familyMember') {
          return {
            ...node,
            data: { 
              ...node.data, 
              serverUrl, 
              onAddRelative,
              isHighlighted: false // Default
            },
            style: {} // Default
          };
        }
        return node;
      });

      setNodes(initialNodes);
      setEdges(layoutedEdges);
      
      // Fit view only on data load
      setTimeout(() => fitView({ padding: 0.2 }), 50);
    } else {
        setNodes([]);
        setEdges([]);
    }
  }, [familyMembers, serverUrl, onAddRelative, setNodes, setEdges, fitView]); // Removed highlightedId

  // 2. Handle Highlighting (Run when highlightedId changes)
  useEffect(() => {
    setNodes((nds) => 
      nds.map((node) => {
        // Only update styling for familyMember nodes
        if (node.type === 'familyMember') {
          const isHighlighted = node.id === highlightedId;
          
          // Optimization: If state matches, don't return new object (React Flow might compare)
          // But strict comparison is complex, so we just return new object.
          return {
            ...node,
            data: {
              ...node.data,
              isHighlighted,
            },
            style: isHighlighted ? { 
              boxShadow: '0 0 25px 8px rgba(76, 175, 80, 0.8)', 
              borderColor: '#4CAF50',
              borderWidth: '2px',
              zIndex: 1000,
              transition: 'box-shadow 0.3s ease, border-color 0.3s ease'
            } : {} // Reset style if not highlighted
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
      setSearchResults(results.slice(0, 5)); // Limit to 5
    } else {
      setSearchResults([]);
    }
  };

  // Fly To Member
  const flyToMember = (member) => {
    const node = nodes.find(n => n.id === member.id.toString());
    if (node) {
      const { x, y } = node.position;
      // Fly animation
      setCenter(x + 100, y + 75, { zoom: 1.5, duration: 1500 }); // Center on node center (approx)
      setHighlightedId(member.id.toString());
      setSearchQuery('');
      setSearchResults([]);
      
      // Highlight persists until user clicks elsewhere
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
      onPaneClick={() => setHighlightedId(null)} // Clear highlight on click background
    >
      <Controls />
      <MiniMap nodeStrokeColor={(n) => {
        if (n.type === 'familyMember') return '#4CAF50';
        return '#eee';
      }} />
      <Background color="#aaa" gap={16} />
      
      {/* Title Overlay */}
      <Panel position="top-center" className="tree-title-overlay">
        The {user?.last_name || 'Family'} Lineage
      </Panel>

      {/* Search Bar Overlay */}
      <Panel position="top-left" style={{ top: 80 }} className="search-panel">
        <div className="search-container">
          <input 
            type="text" 
            placeholder="Search family..." 
            value={searchQuery}
            onChange={handleSearch}
            className="search-input"
          />
          {searchResults.length > 0 && (
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
  const [relationType, setRelationType] = useState('');
  const [relativeToId, setRelativeToId] = useState(null);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

  // Fetch Family Members
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

  // Auto-hide success message after 0.5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleAddRelative = useCallback((type, targetMemberId) => {
    setRelationType(type);
    setRelativeToId(targetMemberId);
    setModalOpen(true);
    setSuccessMessage('');
  }, []);

  const handleAddSelf = () => {
    setRelationType('Self');
    setRelativeToId(null);
    setModalOpen(true);
    setSuccessMessage('');
  };

  const handleMemberAdded = async (message) => {
    setModalOpen(false);
    setSuccessMessage(message || 'Member added successfully!');
    await new Promise(resolve => setTimeout(resolve, 300));
    await fetchFamilyMembers();
  };

  const handleDownload = async () => {
    const flowElement = document.querySelector('.react-flow');
    if (flowElement) {
      // Add printing class to hide UI elements
      flowElement.classList.add('printing-mode');
      
      // Manually force dashed lines on all edges to ensure capture
      const edges = flowElement.querySelectorAll('.react-flow__edge-path, .react-flow__edge path');
      const originalStyles = [];
      edges.forEach(edge => {
        originalStyles.push({
          dash: edge.style.strokeDasharray,
          stroke: edge.style.stroke,
          width: edge.style.strokeWidth
        });
        edge.style.setProperty('stroke-dasharray', '10, 10', 'important');
        edge.style.setProperty('stroke', '#333', 'important');
        edge.style.setProperty('stroke-width', '2px', 'important');
      });
      
      // Wait a moment for styles to apply
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const dataUrl = await toPng(flowElement, {
          filter: (node) => {
            return (
              !node.classList?.contains('react-flow__controls') &&
              !node.classList?.contains('react-flow__minimap')
            );
          },
          backgroundColor: '#f5f7fa',
          pixelRatio: 3, // HD Quality
          style: {
            width: '100%',
            height: '100%',
          }
        });
        download(dataUrl, 'my-family-tree.png');
      } catch (err) {
        console.error('Download failed', err);
      } finally {
        // Remove printing class
        flowElement.classList.remove('printing-mode');
        // Revert inline styles
        edges.forEach((edge, i) => {
          edge.style.strokeDasharray = originalStyles[i].dash;
          edge.style.stroke = originalStyles[i].stroke;
          edge.style.strokeWidth = originalStyles[i].width;
        });
      }
    }
  };

  const handleGenerateBook = async () => {
    setSuccessMessage('Generating Family Book... Please wait.');
    
    const flowElement = document.querySelector('.react-flow');
    if (flowElement) {
      flowElement.classList.add('printing-mode');

      // Manually force dashed lines on all edges
      const edges = flowElement.querySelectorAll('.react-flow__edge-path, .react-flow__edge path');
      const originalStyles = [];
      edges.forEach(edge => {
        originalStyles.push({
          dash: edge.style.strokeDasharray,
          stroke: edge.style.stroke,
          width: edge.style.strokeWidth
        });
        edge.style.setProperty('stroke-dasharray', '10, 10', 'important');
        edge.style.setProperty('stroke', '#333', 'important');
        edge.style.setProperty('stroke-width', '2px', 'important');
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const treeImageBase64 = await toPng(flowElement, {
          filter: (node) => {
            return (
              !node.classList?.contains('react-flow__controls') &&
              !node.classList?.contains('react-flow__minimap')
            );
          },
          backgroundColor: '#f5f7fa',
          pixelRatio: 2, // Slightly lower than download to avoid massive PDF size
          style: {
            width: '100%',
            height: '100%',
          }
        });
        await generateFamilyBook(familyMembers, treeImageBase64, user, serverUrl);
        setSuccessMessage('Family Book generated successfully!');
      } catch (err) {
        console.error('Error generating book:', err);
        setMembersError('Failed to generate book.');
      } finally {
        flowElement.classList.remove('printing-mode');
        // Revert inline styles
        edges.forEach((edge, i) => {
          edge.style.strokeDasharray = originalStyles[i].dash;
          edge.style.stroke = originalStyles[i].stroke;
          edge.style.strokeWidth = originalStyles[i].width;
        });
      }
    }
  };

  return (
    <div className="tree-page-container">
      <Navbar />
      
      {/* Action Bar for Download/Share */}
      {familyMembers.length > 0 && (
        <ActionBar 
          onDownload={handleDownload} 
          onShare={() => setShareModalOpen(true)} 
          onGenerateBook={handleGenerateBook}
        />
      )}

      <div className="tree-content" style={{ height: 'calc(100vh - 80px)', width: '100%' }}>
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
                    user={user} // Pass the user prop here
                  />
                </ReactFlowProvider>
              </div>
            )}
          </>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <AddMemberForm
          relationType={relationType}
          onCancel={() => setModalOpen(false)}
          relativeToId={relativeToId}
          onMemberAdded={handleMemberAdded}
        />
      </Modal>

      <ShareModal 
        isOpen={shareModalOpen} 
        onClose={() => setShareModalOpen(false)} 
      />
    </div>
  );
};

export default Tree;
