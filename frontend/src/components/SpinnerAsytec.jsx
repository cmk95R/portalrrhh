import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

const SpinnerAsytec = ({
  size = 96,
  fullscreen = false,
  text = "Cargando",
  logoSrc = "/logo3.png",
}) => {
  const ring = size * 1.4;
  const stroke = Math.max(3, size * 0.08);

  const Wrapper = ({ children }) =>
    fullscreen ? (
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(6px)",
        }}
      >
        {children}
      </Box>
    ) : (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </Box>
    );

  return (
    <Wrapper>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: ring,
            height: ring,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            component={motion.svg}
            width={ring}
            height={ring}
            viewBox="0 0 100 100"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "linear",
            }}
            sx={{ position: "absolute", inset: 0 }}
          >
            <defs>
              <linearGradient id="asytec-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1e88e5" />
                <stop offset="100%" stopColor="#7e57c2" />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="rgba(0,0,0,0.08)"
              strokeWidth={stroke}
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="url(#asytec-ring)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray="80 200"
            />
          </Box>

          <Box
            component={motion.img}
            src={logoSrc}
            alt="Asytec Sistemas"
            width={size}
            height={size}
            animate={{ scale: [1, 1.06, 1], opacity: [0.95, 1, 0.95] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            sx={{ objectFit: "contain", zIndex: 1 }}
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
          <Typography
            variant="body1"
            sx={{ fontWeight: 600, color: "text.primary" }}
          >
            {text}
          </Typography>
          <Box component="span" sx={{ display: "inline-flex", gap: "2px" }}>
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                component={motion.span}
                animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }}
                sx={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  backgroundColor: "primary.main",
                  display: "inline-block",
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </Wrapper>
  );
};

export default SpinnerAsytec;
