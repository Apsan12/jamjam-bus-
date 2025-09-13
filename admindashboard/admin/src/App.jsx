import { Routes, Route } from "react-router-dom";
import AdminLayout from "./layout/adminLayout";

export default function App() {
  return (  
    <Routes>
      <Route path="/" element={<AdminLayout />}></Route>
    </Routes>
  );
}
