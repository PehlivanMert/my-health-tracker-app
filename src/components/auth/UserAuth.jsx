// userAuth.js
import React from "react";
import { Paper, Typography, TextField, Button } from "@mui/material";
import { handleLogin, handleRegister } from "./AuthHandlers"; // authHandlers dosyasından handleLogin ve handleRegister fonksiyonlarını import edin.

const UserAuth = ({
  isRegister,
  setIsRegister,
  loginData,
  setLoginData,
  setUser,
  errors,
  setErrors,
}) => {
  return (
    <Paper elevation={3} sx={{ p: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        {isRegister ? "Kayıt Ol" : "Giriş Yap"}
      </Typography>

      <form
        onSubmit={(e) =>
          isRegister
            ? handleRegister(e, { loginData, setUser, setLoginData })
            : handleLogin(e, { loginData, setUser, setLoginData })
        }
      >
        <TextField
          name="loginUsername"
          id="loginUserName"
          label="Kullanıcı adı"
          fullWidth
          margin="normal"
          value={loginData.username}
          onChange={(e) => {
            setLoginData({ ...loginData, username: e.target.value });
            setErrors({ ...errors, username: e.target.value.length < 6 });
          }}
          required
          error={errors.username}
          helperText={
            errors.username ? "Kullanıcı adı en az 6 karakter olmalı" : ""
          }
        />

        <TextField
          name="loginPassword"
          id="loginpassword"
          label="Şifre"
          type="password"
          fullWidth
          margin="normal"
          value={loginData.password}
          onChange={(e) => {
            setLoginData({ ...loginData, password: e.target.value });
            setErrors({ ...errors, password: e.target.value.length < 8 });
          }}
          required
          error={errors.password}
          helperText={
            isRegister
              ? "En az 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam ve 1 özel karakter"
              : ""
          }
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mt: 2 }}
          disabled={!loginData.username || !loginData.password}
        >
          {isRegister ? "Kayıt Ol" : "Giriş Yap"}
        </Button>
      </form>

      <Button
        onClick={() => {
          setIsRegister(!isRegister);
          setLoginData({ username: "", password: "" });
        }}
        fullWidth
        sx={{ mt: 2 }}
      >
        {isRegister ? "Giriş Yap" : "Hesap Oluştur"}
      </Button>
    </Paper>
  );
};

export default UserAuth;
