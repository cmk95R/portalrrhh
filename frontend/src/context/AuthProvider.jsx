// src/context/AuthProvider.jsx

import React from "react";
import { meApi } from "../api/auth";
import {AuthContext} from "./AuthContext.jsx"; 
import api from "../api/client"; 
export default function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    // ⬇️ aseguramos header Authorization antes de pedir /auth/profile
    api.defaults.headers.Authorization = `Bearer ${token}`;
    meApi()
      .then(({ data }) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem("token");
        delete api.defaults.headers.Authorization;
      })
      .finally(() => setLoading(false));
  }, []);

  const loginWithToken = (token) => {
    localStorage.setItem("token", token);
    api.defaults.headers.Authorization = `Bearer ${token}`;
    // opcional: podés esperar a /auth/profile acá o dejar que la page SSO lo haga
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete api.defaults.headers.Authorization;
    setUser(null);
  };

  const value = { user, setUser, loading, logout, loginWithToken };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}