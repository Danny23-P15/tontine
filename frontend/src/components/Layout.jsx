import Sidebar from "./Sidebar";
import Header from "./Header";
import "../css/layout.css";
<style>
@import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,200..1000;1,200..1000&display=swap');
</style>

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