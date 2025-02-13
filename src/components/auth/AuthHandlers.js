import { toast } from "react-toastify";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "./firebaseConfig";

export const handleLogin = async (e, { loginData, setUser, setLoginData }) => {
  e.preventDefault();

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      loginData.username,
      loginData.password
    );

    setUser(userCredential.user);
    toast.success("Giriş başarılı!");
    setLoginData({ username: "", password: "" });
  } catch (error) {
    console.error("Giriş hatası:", error);
    switch (error.code) {
      case "auth/user-not-found":
        toast.error("Kullanıcı bulunamadı");
        break;
      case "auth/wrong-password":
        toast.error("Hatalı şifre");
        break;
      case "auth/invalid-email":
        toast.error("Geçersiz email formatı");
        break;
      default:
        toast.error("Giriş işlemi başarısız oldu");
    }
  }
};

export const handleRegister = async (
  e,
  { loginData, setUser, setLoginData }
) => {
  e.preventDefault();

  if (loginData.password.length < 8) {
    toast.error("Şifre en az 8 karakter olmalıdır");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      loginData.username,
      loginData.password
    );

    setUser(userCredential.user);
    toast.success("Kayıt başarılı! Hoş geldiniz.");
    setLoginData({ username: "", password: "" });
  } catch (error) {
    console.error("Kayıt hatası:", error);
    switch (error.code) {
      case "auth/email-already-in-use":
        toast.error("Bu email adresi zaten kullanımda");
        break;
      case "auth/invalid-email":
        toast.error("Geçersiz email formatı");
        break;
      case "auth/weak-password":
        toast.error("Şifre çok zayıf");
        break;
      default:
        toast.error("Kayıt işlemi başarısız oldu");
    }
  }
};

export const handleLogout = async () => {
  try {
    await signOut(auth);
    toast.success("Çıkış yapıldı");
  } catch (error) {
    console.error("Çıkış hatası:", error);
    toast.error("Çıkış işlemi başarısız oldu");
  }
};
