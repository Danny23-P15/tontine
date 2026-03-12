import Sidebar from "./Sidebar";
import Header from "./Header";
import "../css/layout.css";

function Layout({ children }) {
  return (
    <div className="app-layout">
      <Header />
      <div className="app-main">
        <Sidebar />
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;