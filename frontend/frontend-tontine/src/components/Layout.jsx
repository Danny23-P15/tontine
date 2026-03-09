import Sidebar from "./Sidebar";

function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar />
      
      <main className="flex-0 ml-[260px] min-h-screen">
        {children}
      </main>
    </div>
  );
}

export default Layout;