import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Skeleton } from 'primereact/skeleton';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useRef(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        console.error('Failed to fetch users');
        toast.current.show({ severity: 'error', summary: 'Error', detail: 'Failed to fetch users' });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Error fetching users' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const deleteUser = async (userId) => {
    try {
      const response = await fetch(`http://localhost:8000/users/${userId}`, { method: 'DELETE' });
      if (response.ok) {
        setUsers(users.filter(user => user.id !== userId));
        toast.current.show({ severity: 'success', summary: 'Success', detail: 'User deleted successfully' });
      } else {
        throw new Error('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Failed to delete user' });
    }
  };

  const confirmDelete = (userId) => {
    confirmDialog({
      message: 'Are you sure you want to delete this user?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => deleteUser(userId),
    });
  };

  const actionBodyTemplate = (rowData) => {
    return (
      <Button 
        icon="pi pi-trash" 
        className="p-button-rounded p-button-danger" 
        onClick={() => confirmDelete(rowData.id)} 
      />
    );
  };

  const skeletonTemplate = () => {
    return (
      <div className="custom-skeleton">
        <DataTable value={Array(10).fill({})}>
          <Column header="ID" body={<Skeleton width="40%" height="2rem" />} />
          <Column header="Name" body={<Skeleton width="70%" height="2rem" />} />
          <Column header="Surname" body={<Skeleton width="70%" height="2rem" />} />
          <Column header="Email" body={<Skeleton width="100%" height="2rem" />} />
          <Column header="Delete" body={<Skeleton width="4rem" height="2rem" className="p-button-rounded" />} />
        </DataTable>
      </div>
    );
  };

  return (
    <div className="users-page">
      <Toast ref={toast} />
      <ConfirmDialog />
      <h1>Users</h1>
      {loading ? (
        skeletonTemplate()
      ) : (
        <DataTable value={users}>
          <Column field="id" header="ID" />
          <Column field="name" header="Name" />
          <Column field="surname" header="Surname" />
          <Column field="email" header="Email" />
          <Column header="Delete" body={actionBodyTemplate} exportable={false} style={{ minWidth: '8rem' }} />
        </DataTable>
      )}
    </div>
  );
};

export default UsersPage;