import jwt from "jsonwebtoken";
export function signAuthToken(user) {
  return jwt.sign(
    { id: user._id.toString(), rol: user.rol }, // 👈 tu middleware lee "id"
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}
