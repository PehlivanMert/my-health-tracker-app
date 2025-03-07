import React, { useState } from "react";
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  useTheme,
  styled,
  keyframes,
} from "@mui/material";
import {
  handleLogin,
  handleRegister,
  handlePasswordReset,
} from "./AuthHandlers";

// Arka plan tam ekran container
const FullScreenBackground = styled(Box)(({ theme }) => ({
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: -1,
  // background2.jpg dosyasına göre düzeltilmiş yol:
  background: 'url("../../assets/background2.jpg") no-repeat center center',
  backgroundSize: "cover",
}));

// Kartın hafif yukarı-aşağı hareketi
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
`;

// Kalp atışı benzeri efekt
const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
`;

// Glassmorphism efektli stilize kart
const AuthCard = styled(Paper)(({ theme }) => ({
  position: "relative",
  padding: theme.spacing(3),
  width: "90%",
  maxWidth: 450,
  margin: "auto",
  borderRadius: "24px",
  background: "rgba(33, 149, 243, 0.5)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(33, 150, 243, 0.2)",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
  overflow: "hidden",
  transition: "all 0.3s ease-in-out",
  animation: `${float} 4s ease-in-out infinite`,

  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
    width: "95%",
    margin: "10px auto",
  },

  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: "0 12px 40px rgba(33, 150, 243, 0.2)",
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "6px",
    background: "linear-gradient(90deg, #2196F3 0%, #00BCD4 50%, #3F51B5 100%)",
  },
}));

// Animasyonlu buton
const AnimatedButton = styled(Button)(({ theme }) => ({
  background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
  border: 0,
  borderRadius: "20px",
  boxShadow: "0 3px 15px rgba(33, 150, 243, 0.3)",
  color: "white",
  padding: "12px 30px",
  fontSize: "1.1rem",
  fontWeight: 600,
  transition: "all 0.3s ease",
  textTransform: "none",
  "&:hover": {
    background: "linear-gradient(45deg, #1976D2 30%, #303F9F 90%)",
    boxShadow: "0 5px 20px rgba(33, 150, 243, 0.5)",
    transform: "translateY(-2px)",
  },
  "&:disabled": {
    background: "rgba(255, 255, 255, 0.1)",
    color: "rgba(255, 255, 255, 0.5)",
  },
}));

const UserAuth = ({ setUser }) => {
  const theme = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const [errors, setErrors] = useState({ username: false, password: false });

  // Form gönderildiğinde login veya register
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isRegister) {
      handleRegister(e, { loginData, setUser, setLoginData });
    } else {
      handleLogin(e, { loginData, setUser, setLoginData });
    }
  };

  return (
    <>
      {/* Arka plan */}
      <FullScreenBackground />

      {/* Glassmorphism Kart */}
      <AuthCard>
        <Typography
          variant="h3"
          align="center"
          sx={{
            fontWeight: 800,
            background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            mb: 4,
            textShadow: "2px 2px 4px rgba(0,0,0,0.2)",
            animation: `${pulse} 2s ease-in-out infinite`,
          }}
        >
          {isRegister ? "Kayıt Ol" : "Giriş Yap"}
        </Typography>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <TextField
            name="loginUsername"
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            value={loginData.username}
            onChange={(e) => {
              setLoginData({ ...loginData, username: e.target.value });
              setErrors({
                ...errors,
                username: !e.target.value.includes("@"),
              });
            }}
            required
            error={errors.username}
            helperText={
              errors.username ? "Geçerli bir email adresi giriniz" : ""
            }
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.75)",
                color: "#2196F3",
                "& fieldset": {
                  borderColor: "rgba(255, 255, 255, 0.3)",
                },
                "&:hover fieldset": {
                  borderColor: "#2196F3",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#3F51B5",
                },
              },
              mb: 3,
            }}
            InputLabelProps={{
              style: { color: "#2196F3" },
            }}
          />

          {/* Şifre */}
          <TextField
            name="loginPassword"
            label="Şifre"
            type="password"
            fullWidth
            margin="normal"
            value={loginData.password}
            onChange={(e) => {
              setLoginData({ ...loginData, password: e.target.value });
              setErrors({
                ...errors,
                password: e.target.value.length < 8 && isRegister,
              });
            }}
            required
            error={errors.password}
            helperText={isRegister ? "En az 8 karakter olmalıdır" : ""}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                background: "rgb(255, 255, 255, 0.75)",
                color: "#2196F3",
                "& fieldset": {
                  borderColor: "rgba(255, 255, 255, 0.3)",
                },
                "&:hover fieldset": {
                  borderColor: "#2196F3",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#3F51B5",
                },
              },
              mb: 3,
            }}
            InputLabelProps={{
              style: { color: "#2196F3" },
            }}
          />

          {/* Kayıt modunda isim ve soyisim */}
          {isRegister && (
            <>
              <TextField
                name="firstName"
                label="İsim"
                fullWidth
                margin="normal"
                value={loginData.firstName}
                onChange={(e) =>
                  setLoginData({ ...loginData, firstName: e.target.value })
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.75)",
                    color: "#2196F3",
                    "& fieldset": {
                      borderColor: "rgba(255, 255, 255, 0.3)",
                    },
                    "&:hover fieldset": {
                      borderColor: "#2196F3",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#3F51B5",
                    },
                  },
                  mb: 3,
                }}
                InputLabelProps={{
                  style: { color: "#2196F3" },
                }}
              />

              <TextField
                name="lastName"
                label="Soyisim"
                fullWidth
                margin="normal"
                value={loginData.lastName}
                onChange={(e) =>
                  setLoginData({ ...loginData, lastName: e.target.value })
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.75)",
                    color: "#2196F3",
                    "& fieldset": {
                      borderColor: "rgba(255, 255, 255, 0.3)",
                    },
                    "&:hover fieldset": {
                      borderColor: "#2196F3",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#3F51B5",
                    },
                  },
                  mb: 3,
                }}
                InputLabelProps={{
                  style: { color: "#2196F3" },
                }}
              />
            </>
          )}

          {/* Giriş/Kayıt Butonu */}
          <AnimatedButton
            type="submit"
            fullWidth
            disabled={!loginData.username || !loginData.password}
          >
            {isRegister ? "Kayıt Ol" : "Giriş Yap"}
          </AnimatedButton>
        </form>

        {/* Şifre Sıfırlama ve Giriş/Kayıt Mod Değiştirme */}
        <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
          {!isRegister && (
            <Button
              onClick={() => handlePasswordReset(loginData.username)}
              variant="text"
              sx={{
                color: "#2196F3",
                textTransform: "none",
                "&:hover": {
                  color: "#3F51B5",
                  background: "rgba(33, 150, 243, 0.1)",
                },
              }}
            >
              Şifremi Unuttum
            </Button>
          )}

          <Button
            onClick={() => {
              setIsRegister(!isRegister);
              setLoginData({
                username: "",
                password: "",
                firstName: "",
                lastName: "",
              });
            }}
            variant="text"
            sx={{
              color: "#2196F3",
              textTransform: "none",
              "&:hover": {
                color: "#3F51B5",
                background: "rgba(33, 150, 243, 0.1)",
              },
            }}
          >
            {isRegister ? "Hesabın var mı? Giriş Yap" : "Hesap Oluştur"}
          </Button>
        </Box>
      </AuthCard>
    </>
  );
};

export default UserAuth;
