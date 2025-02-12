// authHandlers.js
import { toast } from "react-toastify";
import { hashPassword, validateUsername, validatePassword } from "./Helper";
export const handleLogin = async (e, { loginData, setUser, setLoginData }) => {
  e.preventDefault();

  try {
    const users = JSON.parse(localStorage.getItem("users")) || {};
    const userData = users[loginData.username];

    if (!userData) {
      toast.error("Kullanıcı bulunamadı");
      return;
    }

    const hashedInputPassword = await hashPassword(loginData.password);

    if (userData.password === hashedInputPassword) {
      setUser(loginData.username);
      localStorage.setItem("currentUser", loginData.username);
      toast.success("Giriş başarılı!");
      setLoginData({ username: "", password: "" });
    } else {
      toast.error("Hatalı şifre");
    }
  } catch (error) {
    console.error("Giriş hatası:", error);
    toast.error("Giriş işlemi başarısız oldu");
  }
};

export const handleRegister = async (
  e,
  { loginData, setUser, setLoginData }
) => {
  e.preventDefault();

  const usernameValidation = validateUsername(loginData.username);
  if (!usernameValidation.isValid) {
    toast.error(usernameValidation.message);
    return;
  }

  const passwordValidation = validatePassword(loginData.password);
  if (!passwordValidation.isValid) {
    toast.error(passwordValidation.message);
    return;
  }

  try {
    const users = JSON.parse(localStorage.getItem("users")) || {};
    if (users[loginData.username]) {
      toast.error("Bu kullanıcı adı zaten kullanımda");
      return;
    }

    const hashedPassword = await hashPassword(loginData.password);
    users[loginData.username] = {
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem("users", JSON.stringify(users));
    setUser(loginData.username);
    localStorage.setItem("currentUser", loginData.username);

    toast.success("Kayıt başarılı! Hoş geldiniz.");
    setLoginData({ username: "", password: "" });
  } catch (error) {
    console.error("Kayıt hatası:", error);
    toast.error("Kayıt işlemi başarısız oldu.");
  }
};
