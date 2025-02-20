import React, { useState } from "react";
import { Paper, Typography, TextField, Button } from "@mui/material";
import {
  handleLogin,
  handleRegister,
  handlePasswordReset,
} from "./AuthHandlers";

const UserAuth = ({ setUser }) => {
  // Bileşen içi state’ler
  const [isRegister, setIsRegister] = useState(false);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({ username: false, password: false });

  return (
    <Paper
      elevation={8}
      sx={{
        p: 5,
        maxWidth: 450,
        margin: "auto",
        mt: 8,
        borderRadius: 4,
        background: "linear-gradient(135deg, #f6f8ff 0%, #ffffff 100%)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "6px",
          background:
            "linear-gradient(90deg, #2196F3 0%, #00BCD4 50%, #3F51B5 100%)",
        },
        transition: "transform 0.3s ease-in-out",
        "&:hover": {
          transform: "translateY(-5px)",
        },
      }}
    >
      <Typography
        variant="h4"
        align="center"
        sx={{
          fontWeight: 700,
          background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          mb: 4,
          letterSpacing: "0.5px",
        }}
      >
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
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(8px)",
              transition: "all 0.3s ease",
              "&:hover": {
                background: "rgba(255, 255, 255, 0.95)",
                transform: "translateX(5px)",
              },
              "&.Mui-focused": {
                transform: "translateX(5px)",
              },
            },
            mb: 2,
          }}
        />

        <TextField
          name="loginPassword"
          id="loginPassword"
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
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(8px)",
              transition: "all 0.3s ease",
              "&:hover": {
                background: "rgba(255, 255, 255, 0.95)",
                transform: "translateX(5px)",
              },
              "&.Mui-focused": {
                transform: "translateX(5px)",
              },
            },
            mb: 3,
          }}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          sx={{
            mt: 2,
            py: 1.8,
            borderRadius: 3,
            textTransform: "none",
            fontSize: "1.1rem",
            fontWeight: 600,
            background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
            boxShadow: "0 3px 15px rgba(33, 150, 243, 0.3)",
            transition: "all 0.3s ease",
            "&:hover": {
              background: "linear-gradient(45deg, #1976D2 30%, #303F9F 90%)",
              boxShadow: "0 5px 20px rgba(33, 150, 243, 0.5)",
              transform: "translateY(-2px)",
            },
          }}
          disabled={!loginData.username || !loginData.password}
        >
          {isRegister ? "Kayıt Ol" : "Giriş Yap"}
        </Button>
      </form>

      {!isRegister && (
        <Button
          onClick={() => handlePasswordReset(loginData.username)}
          fullWidth
          variant="text"
          sx={{
            mt: 2.5,
            color: "#3F51B5",
            textTransform: "none",
            fontSize: "0.95rem",
            transition: "all 0.3s ease",
            "&:hover": {
              background: "rgba(63, 81, 181, 0.08)",
              transform: "translateX(5px)",
            },
          }}
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
        variant="outlined"
        sx={{
          mt: 2.5,
          borderRadius: 3,
          textTransform: "none",
          fontSize: "0.95rem",
          borderWidth: 2,
          borderColor: "#3F51B5",
          color: "#3F51B5",
          transition: "all 0.3s ease",
          "&:hover": {
            borderWidth: 2,
            background: "rgba(63, 81, 181, 0.08)",
            transform: "translateX(5px)",
          },
        }}
      >
        {isRegister ? "Giriş Yap" : "Hesap Oluştur"}
      </Button>
    </Paper>
  );
};

export default UserAuth;
