import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import WelcomePage from "@/pages/WelcomePage";
import DashboardPage from "@/pages/DashboardPage";

function App() {
  return (
    <div className="App min-h-screen bg-background text-foreground noise-bg">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/dashboard/:sessionId" element={<DashboardPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: 'hsl(218 39% 14%)',
            border: '1px solid hsl(217 19% 24%)',
            color: 'hsl(210 40% 98%)',
          },
        }}
      />
    </div>
  );
}

export default App;
