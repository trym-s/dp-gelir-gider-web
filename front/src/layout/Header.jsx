import "./Header.css";
import { Button } from "antd";

export default function Header({ title, toggleSidebar }) {
  const username = localStorage.getItem("username");

  return (
    <header className="app-header">
      <div className="left">
        <button onClick={toggleSidebar} className="menu-button">≡</button>
        <h1>{title}</h1>
      </div>

      <div className="right">
        <span style={{ marginRight: 30 }}>
          Hoş geldiniz{username ? `, ${username}` : ""}!
        </span>
        <img
          src="/user.png"
          alt="Profil"
          className="profil"
        />
        <Button
          size="small"
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("username");
            window.location.href = "/login";
          }}
        >
          Çıkış Yap
        </Button>
      </div>
    </header>
  );
}
