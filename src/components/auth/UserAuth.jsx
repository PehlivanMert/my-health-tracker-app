import React from "react";
import { Paper, Typography, TextField, Button } from "@mui/material";
import {
  handleLogin,
  handleRegister,
  handlePasswordReset,
} from "./AuthHandlers";

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
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          value={loginData.username}
          onChange={(e) => {
            setLoginData({ ...loginData, username: e.target.value });
            setErrors({ ...errors, username: !e.target.value.includes("@") });
          }}
          required
          error={errors.username}
          helperText={errors.username ? "Geçerli bir email adresi giriniz" : ""}
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
          helperText={isRegister ? "En az 8 karakter olmalıdır" : ""}
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

      {!isRegister && (
        <Button
          onClick={() => handlePasswordReset(loginData.username)}
          fullWidth
          sx={{ mt: 1 }}
        >
          Şifremi Unuttum
        </Button>
      )}

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
