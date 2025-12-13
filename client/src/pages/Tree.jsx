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
  ReactFlowProvider
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
import './Tree.css';

const nodeTypes = {
  familyMember: FamilyNode,
};

// Internal component to use ReactFlow hooks
const TreeVisualizer = ({ familyMembers, serverUrl, onAddRelative }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView, getNodes } = useReactFlow();

  // Compute Layout
  useEffect(() => {
    if (familyMembers.length > 0) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(familyMembers);

      const nodesWithData = layoutedNodes.map((node) => {
        if (node.type === 'familyMember') {
          return {
            ...node,
            data: { 
              ...node.data, 
              serverUrl, 
              onAddRelative 
            },
          };
        }
        return node;
      });

      setNodes(nodesWithData);
      setEdges(layoutedEdges);
      
      // Delay fitView slightly to allow render
      setTimeout(() => fitView({ padding: 0.2 }), 50);
    } else {
        setNodes([]);
        setEdges([]);
    }
  }, [familyMembers, serverUrl, onAddRelative, setNodes, setEdges, fitView]);

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
    >
      <Controls />
      <MiniMap nodeStrokeColor={(n) => {
        if (n.type === 'familyMember') return '#4CAF50';
        return '#eee';
      }} />
      <Background color="#aaa" gap={16} />
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

  const serverUrl = 'http://localhost:5000';

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

  const handleDownload = () => {
    const flowElement = document.querySelector('.react-flow');
    if (flowElement) {
      toPng(flowElement, {
        filter: (node) => {
          // Exclude controls and minimap from the screenshot
          return (
            !node.classList?.contains('react-flow__controls') &&
            !node.classList?.contains('react-flow__minimap')
          );
        },
        backgroundColor: '#f5f7fa',
        style: {
          width: '100%',
          height: '100%',
        }
      })
      .then((dataUrl) => {
        download(dataUrl, 'my-family-tree.png');
      });
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
