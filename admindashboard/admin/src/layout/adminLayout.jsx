import { Outlet } from "react-router-dom";
import NavBar from "../components/NavBar";
import Sidebar from "../components/sidebar";
import Footer from "../components/Footer";

export default function AdminLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <Sidebar />
      <Footer />

      <div className="flex-1 p-4 bg-gray-50">
        <Outlet /> {/* This is where your pages will load */}

      </div>
    </div>
  );
}
