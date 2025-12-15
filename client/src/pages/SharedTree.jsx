import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactFlow, { 
  Controls, 
  Background, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import axios from 'axios'; // Direct axios for custom route
import 'reactflow/dist/style.css';

import Modal from '../components/Modal';
import AddMemberForm from '../components/AddMemberForm';
import FamilyNode from '../components/FamilyNode';
import { getLayoutedElements } from '../utils/treeLayout';
import './Tree.css'; // Reusing Tree styles

const nodeTypes = {
  familyMember: FamilyNode,
};

// Internal component for shared tree visualization
const SharedTreeVisualizer = ({ familyMembers, serverUrl, onAddRelative, permission }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();

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
              // Only pass onAddRelative if permission is 'edit'
              onAddRelative: permission === 'edit' ? onAddRelative : undefined 
            },
          };
        }
        return node;
      });

      setNodes(nodesWithData);
      setEdges(layoutedEdges);
      setTimeout(() => fitView({ padding: 0.2 }), 50);
    }
  }, [familyMembers, serverUrl, onAddRelative, permission, setNodes, setEdges, fitView]);

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
      nodesDraggable={false} // Disable dragging for shared view generally, or enable if preferred
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

const SharedTree = () => {
  const { token } = useParams();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [permission, setPermission] = useState('view');
  const [ownerId, setOwnerId] = useState(null);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [relationType, setRelationType] = useState('');
  const [relativeToId, setRelativeToId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [highlightedId, setHighlightedId] = useState(null);

  const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchSharedTree = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${serverUrl}/api/share/${token}`);
      setFamilyMembers(response.data.members);
      setPermission(response.data.permission);
      setOwnerId(response.data.ownerId);
    } catch (err) {
      console.error(err);
      setError('Invalid or expired link.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSharedTree();
  }, [fetchSharedTree]);

   // Auto-hide success message
   useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleAddRelative = useCallback((type, targetMemberId) => {
    if (permission !== 'edit') return;
    setRelationType(type);
    setRelativeToId(targetMemberId);
    setModalOpen(true);
  }, [permission]);

  // Custom handler for adding member via token
  const handleMemberAdded = async (message) => {
    setModalOpen(false);
    setSuccessMessage(message || 'Member added successfully!');
    await new Promise(resolve => setTimeout(resolve, 300));
    await fetchSharedTree();
  };

  return (
    <div className="tree-page-container">
      {/* Simplified Navbar for Shared View */}
      <nav className="navbar" style={{ padding: '0 2rem' }}>
        <div className="navbar-logo">
          <Link to="/">🌳 Family Tree (Shared View)</Link>
        </div>
        <div className="navbar-links">
           <Link to="/signup" className="nav-link">Create Your Own Tree</Link>
        </div>
      </nav>

      <div className="tree-content" style={{ height: 'calc(100vh - 60px)', width: '100%' }}>
        {loading && <div className="loading-overlay">Loading shared tree...</div>}
        {error && <div className="error-message" style={{ margin: '2rem', textAlign: 'center' }}>{error}</div>}
        {successMessage && <div className="success-toast">{successMessage}</div>}

        {!loading && !error && (
           <div style={{ width: '100%', height: '100%' }}>
             <ReactFlowProvider>
               <SharedTreeVisualizer 
                 familyMembers={familyMembers}
                 serverUrl={serverUrl}
                 onAddRelative={handleAddRelative}
                 permission={permission}
               />
             </ReactFlowProvider>
           </div>
        )}
      </div>

      {permission === 'edit' && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
            {/* We need to modify AddMemberForm to accept a custom submit handler or context.
                However, existing AddMemberForm uses 'api' utility which uses localStorage token.
                Since we are visiting as a guest, we don't have that token.
                
                Workaround: We will render a custom form or wrapping AddMemberForm is tricky.
                
                Correction: We must create a wrapper or modified AddMemberForm that can use the token endpoint.
                
                Better: Pass a 'customSubmit' prop to AddMemberForm.
            */}
           <AddMemberForm
              relationType={relationType}
              onCancel={() => setModalOpen(false)}
              relativeToId={relativeToId}
              onMemberAdded={handleMemberAdded}
              // We need to support custom endpoint in AddMemberForm
              customEndpoint={`${serverUrl}/api/share/${token}/members`}
           />
        </Modal>
      )}
    </div>
  );
};

export default SharedTree;
