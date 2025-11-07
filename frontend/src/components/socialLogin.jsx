import React from "react";
import { Button, Divider, Stack } from "@mui/material";

const API_URL = import.meta.env.VITE_API_URL || "";

const redirectTo = new URLSearchParams(location.search).get("redirectTo") || "/";


const GoogleIcon = (props) => (
    <svg width="18" height="18" viewBox="0 0 48 48" {...props}>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C34.7 31.9 30 35 24 35c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.3 0 6.3 1.2 8.6 3.3l5.7-5.7C34.7 3.3 29.6 1 24 1 11.8 1 2 10.8 2 23s9.8 22 22 22 22-9.8 22-22c0-1.5-.2-2.9-.4-4.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.3 16 18.8 13 24 13c3.3 0 6.3 1.2 8.6 3.3l5.7-5.7C34.7 6.3 29.6 4 24 4 16.1 4 9.3 8.6 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 42c6 0 10.7-2 14.2-5.4l-6.6-5.4C29.3 33.8 26.8 35 24 35c-6 0-10.7-4.1-12.4-9.6l-6.7 5.2C7.9 37.4 15.3 42 24 42z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.3 4-5.2 7-11.3 7-6 0-11.1-4-12.8-9.4l-6.7 5.2C7.9 37.4 15.3 42 24 42c10.7 0 19-8.3 19-19 0-1.5-.2-2.9-.4-4.5z" />
    </svg>
);

const FacebookIcon = (props) => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...props}>
        <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.438H7.078V12.07h3.047V9.413c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.492 0-1.955.928-1.955 1.88v2.255h3.328l-.532 3.492h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
);

export default function SocialLogin({ redirectTo }) {
    const onOAuth = (provider) => {
        // Pasamos redirectTo para que el backend pueda redirigirnos luego del callback
        if (!API_URL) return alert("Falta VITE_API_URL en el .env del front");
        // usamos 'state' para transportar redirectTo
        const url = `${API_URL}/auth/${provider}?state=${encodeURIComponent(redirectTo)}`;
        window.location.href = url;
    };

    return (
        <>
            {/* --- Social logins --- */}
            <Divider sx={{ my: 3 }}>o continúa con</Divider>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button
                    onClick={() => onOAuth("google")}
                    variant="outlined"
                    fullWidth
                    startIcon={<GoogleIcon />}
                    sx={{ py: 1.1, fontWeight: 600 }}
                >
                    Google
                </Button>

                {/* <Button
                    onClick={() => onOAuth("facebook")}
                    variant="outlined"
                    fullWidth
                    startIcon={<FacebookIcon />}
                    sx={{ py: 1.1, fontWeight: 600 }}
                >
                    Facebook
                </Button> */}
            </Stack>
        </>
    );
}
