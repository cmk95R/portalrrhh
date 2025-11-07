// src/pages/LoginSso.jsx
import { useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { meApi } from "../api/auth";
import api from "../api/client";

export default function LoginSso() {
  const nav = useNavigate();
  const loc = useLocation();
  const { setUser, loginWithToken } = useContext(AuthContext);

  useEffect(() => {
    const qp = new URLSearchParams(loc.search);
    const token = qp.get("token");
    const redirectTo = qp.get("redirectTo") || "/";

    (async () => {
      if (!token) return nav("/login", { replace: true });

      loginWithToken(token);
      try {
        const { data } = await meApi(); // GET /auth/profile
        setUser(data?.user || data);
        nav(redirectTo, { replace: true });
      } catch {
        localStorage.removeItem("token");
        delete api.defaults.headers.Authorization;
        nav("/login", { replace: true });
      }
    })();
  }, [loc.search, nav, setUser, loginWithToken]);

  return null; // o un spinner
}
