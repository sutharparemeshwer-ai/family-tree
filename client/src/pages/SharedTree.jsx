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
import api, { SERVER_URL, API_URL } from '../utils/api';
import 'reactflow/dist/style.css';

import Modal from '../components/Modal';
import AddMemberForm from '../components/AddMemberForm';
import FamilyNode from '../components/FamilyNode';
import ConfirmationModal from '../components/ConfirmationModal';
import { getLayoutedElements } from '../utils/treeLayout';
import './Tree.css'; 

const nodeTypes = {
  familyMember: FamilyNode,
};

// Internal component for shared tree visualization
const SharedTreeVisualizer = ({ familyMembers, serverUrl, onAddRelative, onEdit, onDelete, permission }) => {
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
              // Only pass handlers if permission is 'edit'
              onAddRelative: permission === 'edit' ? onAddRelative : undefined,
              onEdit: permission === 'edit' ? onEdit : undefined,
              onDelete: permission === 'edit' ? onDelete : undefined,
            },
          };
        }
        return node;
      });

      setNodes(nodesWithData);
      setEdges(layoutedEdges);
      setTimeout(() => fitView({ padding: 0.2 }), 50);
    }
  }, [familyMembers, serverUrl, onAddRelative, onEdit, onDelete, permission, setNodes, setEdges, fitView]);

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
      nodesDraggable={false} 
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
  
  // State for Tree
  const [familyMembers, setFamilyMembers] = useState([]);
  const [permission, setPermission] = useState('view'); 
  const [ownerName, setOwnerName] = useState('');
  const [treeLabel, setTreeLabel] = useState('');

  // State for Guest Access
  const [isVerified, setIsVerified] = useState(false); 
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '' });
  const [showGuestLogin, setShowGuestLogin] = useState(false);
  const [verifying, setVerifying] = useState(true);

  // State for UI
  const [modalOpen, setModalOpen] = useState(false);
  const [relationType, setRelationType] = useState('');
  const [relativeToId, setRelativeToId] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  const serverUrl = SERVER_URL;

  // 1. Initial Check: Verify Token & Check Session
  useEffect(() => {
    const checkToken = async () => {
      setVerifying(true);
      try {
        const res = await api.get(`/share/verify/${token}`);
        if (res.data.valid) {
          setPermission(res.data.permission);
          setOwnerName(res.data.ownerName);
          setTreeLabel(res.data.label);

          if (res.data.permission === 'edit') {
            const storedGuest = sessionStorage.getItem(`guest_info_${token}`);
            if (storedGuest) {
              setGuestInfo(JSON.parse(storedGuest));
              setIsVerified(true);
              fetchTreeData();
            } else {
              setShowGuestLogin(true); 
            }
          } else {
            setIsVerified(true);
            fetchTreeData();
          }
        }
      } catch (err) {
        setError('This link is invalid or has expired.');
      } finally {
        setVerifying(false);
      }
    };
    checkToken();
  }, [token]);

  const fetchTreeData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/share/${token}`);
      setFamilyMembers(response.data.members);
    } catch (err) {
      setError('Failed to load tree data.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLoginSubmit = (e) => {
    e.preventDefault();
    if (!guestInfo.name) return;
    sessionStorage.setItem(`guest_info_${token}`, JSON.stringify(guestInfo));
    setIsVerified(true);
    setShowGuestLogin(false);
    fetchTreeData();
  };

  // --- Handlers ---

  const handleAddRelative = useCallback((type, targetMemberId) => {
    if (permission !== 'edit') return;
    setRelationType(type);
    setRelativeToId(targetMemberId);
    setEditingMember(null);
    setModalOpen(true);
  }, [permission]);

  const handleEditMember = useCallback((member) => {
    if (permission !== 'edit') return;
    setEditingMember(member);
    setModalOpen(true);
  }, [permission]);

  const handleDeleteRequest = useCallback((memberId) => {
    if (permission !== 'edit') return;
    setMemberToDelete(memberId);
    setDeleteModalOpen(true);
  }, [permission]);

  const confirmDelete = async () => {
    if (!memberToDelete) return;
    try {
        await api.delete(`/share/${token}/members/${memberToDelete}`, {
            headers: {
                'X-Guest-Name': guestInfo.name,
                'X-Guest-Email': guestInfo.email
            }
        });
        setSuccessMessage('Member deleted successfully.');
        setDeleteModalOpen(false);
        setMemberToDelete(null);
        await fetchTreeData();
    } catch (err) {
        console.error('Delete failed:', err);
        setError('Failed to delete member.');
        setDeleteModalOpen(false);
    }
  };

  const handleFormSubmit = async (message) => {
    setModalOpen(false);
    setSuccessMessage(message || 'Operation successful!');
    await fetchTreeData();
  };

  // Render: Loading / Error
  if (verifying) return <div className="loading-overlay">Verifying Link...</div>;
  if (error) return (
    <div className="error-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ color: '#ef5350' }}>Link Error</h2>
      <p>{error}</p>
      <Link to="/" style={{ color: '#4CAF50' }}>Return Home</Link>
    </div>
  );

  // Render: Guest Login Gate
  if (showGuestLogin && !isVerified) {
    return (
      <div className="guest-login-container" style={{ 
        display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', 
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' 
      }}>
        <div style={{ 
          background: 'white', padding: '40px', borderRadius: '20px', 
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxWidth: '400px', width: '90%' 
        }}>
          <h2 style={{ marginBottom: '10px', color: '#333' }}>Welcome!</h2>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            You have been invited to edit the <strong>{treeLabel}</strong> family tree by <strong>{ownerName}</strong>.
          </p>
          <p style={{ marginBottom: '30px', fontSize: '0.9rem', color: '#888' }}>
            Please enter your name so your changes can be tracked.
          </p>
          
          <form onSubmit={handleGuestLoginSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#555' }}>Your Name</label>
              <input 
                type="text" required value={guestInfo.name}
                onChange={(e) => setGuestInfo({...guestInfo, name: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
                placeholder="e.g. Uncle Bob"
              />
            </div>
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#555' }}>Your Email (Optional)</label>
              <input 
                type="email" value={guestInfo.email}
                onChange={(e) => setGuestInfo({...guestInfo, email: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
                placeholder="bob@example.com"
              />
            </div>
            <button type="submit" style={{ 
              width: '100%', padding: '12px', background: '#4CAF50', color: 'white', 
              border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer' 
            }}>
              Access Tree
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render: Tree View
  return (
    <div className="tree-page-container">
      <nav className="navbar" style={{ padding: '0 2rem' }}>
        <div className="navbar-logo">
          <Link to="/">🌳 Family Tree {treeLabel && `- ${treeLabel}`}</Link>
        </div>
        <div className="navbar-links">
           <span style={{ marginRight: '20px', fontSize: '0.9rem', color: '#555' }}>
             {permission === 'edit' ? `Editing as: ${guestInfo.name}` : 'View Only Mode'}
           </span>
           <Link to="/signup" className="nav-link">Create Your Own</Link>
        </div>
      </nav>

      <div className="tree-content" style={{ height: 'calc(100vh - 60px)', width: '100%' }}>
        {loading && <div className="loading-overlay">Loading shared tree...</div>}
        {successMessage && <div className="success-toast">{successMessage}</div>}

        {!loading && (
           <div style={{ width: '100%', height: '100%' }}>
             <ReactFlowProvider>
               <SharedTreeVisualizer 
                 familyMembers={familyMembers}
                 serverUrl={serverUrl}
                 onAddRelative={handleAddRelative}
                 onEdit={handleEditMember}
                 onDelete={handleDeleteRequest}
                 permission={permission}
               />
             </ReactFlowProvider>
           </div>
        )}
      </div>

      {permission === 'edit' && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
           <AddMemberForm
              relationType={relationType}
              relativeToId={relativeToId}
              editingMember={editingMember}
              onCancel={() => setModalOpen(false)}
              onMemberAdded={handleFormSubmit}
              customEndpoint={`${API_URL}/share/${token}/members${editingMember ? `/${editingMember.id}` : ''}`}
              customHeaders={{
                'X-Guest-Name': guestInfo.name,
                'X-Guest-Email': guestInfo.email
              }}
           />
        </Modal>
      )}

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Member?"
        message="Are you sure you want to delete this family member? This action is logged."
      />
    </div>
  );
};

export default SharedTree;
