import React from "react";
import logoImg from "../assets/logo.png";

const NavBar     = ({ logo }) => {
  // If a logo prop is passed, use it; otherwise use the assets image
  const logoNode =
    typeof logo === "string" ? (
      <img src={logo} alt="Logo" className="h-30 w-auto" />
    ) : logo ? (
      logo
    ) : (
      <img src={logoImg} alt="Logo" className="h-30 w-auto" />
    );

  return (
    <div className="w-full bg-yellow-10 0 shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">{logoNode}</div>
        <div className="flex items-center">
          <span className="text-3xl font-bold text-yellow-800 hover-underline">
            Admin Dashboard 
          </span>
        </div>
        <div className="flex items-center">
          <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-800">
            LogOut
          </button>
        </div>
      </div>
    </div>
  );
};

export default NavBar;
