import { Button } from 'primereact/button';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-column align-items-center justify-content-center min-h-screen">
      <div className="flex justify-content-center align-items-center bg-red-500 border-circle mb-5" style={{width: '8rem', height: '8rem'}}>
        <i className="pi pi-exclamation-triangle text-7xl text-white"></i>
      </div>
      <span className="text-red-500 font-bold text-5xl">404</span>
      <h1 className="text-900 font-bold text-5xl mb-2">Not Found</h1>
      <div className="text-600 mb-5">Requested resource is not available</div>
      <Button icon="pi pi-arrow-left" label="Go Back" onClick={() => navigate(-1)} />
    </div>
  );
};

export default NotFoundPage;
