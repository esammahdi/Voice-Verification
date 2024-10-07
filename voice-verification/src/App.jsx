import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import 'primereact/resources/themes/lara-light-indigo/theme.css'; //theme
import 'primereact/resources/primereact.min.css'; //core css
import 'primeicons/primeicons.css'; //icons
import 'primeflex/primeflex.css';
import './App.css';

import Navbar from './components/Navbar';
import ComparePage from './pages/ComparePage';
import UsersPage from './pages/UsersPage';
import AddUserPage from './pages/AddUserPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<ComparePage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/add-user" element={<AddUserPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;