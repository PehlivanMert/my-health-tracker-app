import React, { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  useTheme,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Slide,
  Container,
  alpha,
  styled,
  keyframes,
  Button,
} from "@mui/material";
import { Delete, Edit, FitnessCenter, Add, Close } from "@mui/icons-material";
import axios from "axios";
import { toast } from "react-toastify";

const TRANSLATIONS = {
  bodyParts: {
    chest: "Göğüs",
    back: "Sırt",
    legs: "Bacak",
    shoulders: "Omuz",
    arms: "Kol",
    core: "Karın",
    cardio: "Kardiyo",
  },
  equipment: {
    bodyweight: "Vücut Ağırlığı",
    cable: "Kablo Makinesi",
    dumbbell: "Dambıl",
    bands: "Direnç Bandı",
    barbell: "Halter",
    kettlebell: "Kettlebell",
    machine: "Ağırlık Makinesi",
  },
};

// Animasyonlar
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const isIOS = () =>
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent);

// Stilize Bileşenler
const GlowingCard = styled(Box)(({ theme, glowColor }) => {
  const ios = isIOS();
  return {
    background: ios ? "rgba(255,255,255,0.1)" : "rgba(255, 255, 255, 0.1)",
    color: "#fff", // metin rengini beyaz tutuyoruz
    borderRadius: "24px",
    // iOS için backdrop-filter devre dışı bırakılıyor
    WebkitBackdropFilter: ios ? "none" : "blur(10px)",
    backdropFilter: ios ? "none" : "blur(10px)",
    boxShadow: `0 0 20px ${glowColor || "#2196F322"}`,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": {
      transform: "translateY(-5px)",
      boxShadow: `0 0 40px ${glowColor || "#2196F344"}`,
    },
  };
});

const AnimatedButton = styled(Button)(({ theme }) => ({
  background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
  border: 0,
  borderRadius: 25,
  boxShadow: "0 3px 5px 2px rgba(33, 150, 243, .3)",
  color: "white",
  padding: "12px 30px",
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "scale(1.05)",
    boxShadow: "0 5px 15px 3px rgba(33, 150, 243, .4)",
  },
}));

const Exercises = ({ exercises, setExercises }) => {
  const theme = useTheme();
  const [openModal, setOpenModal] = useState(false);
  const [modalType, setModalType] = useState("api");
  const [apiExercises, setApiExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [filters, setFilters] = useState({
    bodyPart: "",
    equipment: "",
    name: "",
  });
  const [customExercise, setCustomExercise] = useState({
    id: null,
    title: "",
    target: "",
    equipment: "",
    instructions: "",
  });

  const BODY_PARTS = Object.keys(TRANSLATIONS.bodyParts);
  const EQUIPMENTS = Object.keys(TRANSLATIONS.equipment);

  const API_URL = "https://exercisedb.p.rapidapi.com/exercises";
  const API_OPTIONS = {
    headers: {
      "X-RapidAPI-Key": import.meta.env.VITE_XRAPID_API_KEY,
      "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
    },
    timeout: 10000,
  };

  const capitalizeWords = (str) => {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const fetchExercises = async () => {
    try {
      setLoading(true);
      setError("");
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v)
      );

      const response = await axios.get(API_URL, {
        ...API_OPTIONS,
        params,
      });

      const exercises = response.data.slice(0, 12).map((ex) => ({
        ...ex,
        name: capitalizeWords(ex.name),
        target: capitalizeWords(ex.target),
        equipment: capitalizeWords(ex.equipment),
      }));

      setApiExercises(exercises);
    } catch (err) {
      setError(
        err.response?.data?.message || "Egzersizler yüklenirken hata oluştu"
      );
      toast.error("Egzersiz verileri alınamadı");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCustomExercise = () => {
    if (!customExercise.title || !customExercise.instructions) {
      toast.error("Lütfen zorunlu alanları doldurun");
      return;
    }

    const newExercise = {
      id: customExercise.id || Date.now().toString(),
      title: capitalizeWords(customExercise.title),
      content: `Hedef: ${customExercise.target || "Belirtilmemiş"}\nEkipman: ${
        customExercise.equipment || "Belirtilmemiş"
      }\nTalimatlar:\n${customExercise.instructions
        .split("\n")
        .map((step, index) => `${index + 1}. ${step}`)
        .join("\n")}`,
    };

    setExercises((prev) => {
      if (customExercise.id) {
        return prev.map((ex) =>
          ex.id === customExercise.id ? newExercise : ex
        );
      }
      return [...prev, newExercise];
    });

    toast.success(
      customExercise.id ? "Egzersiz güncellendi!" : "Özel egzersiz eklendi!"
    );

    setCustomExercise({
      id: null,
      title: "",
      target: "",
      equipment: "",
      instructions: "",
    });
    setModalType("api");
    setOpenModal(false);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
        padding: { xs: 2, md: 4 },
      }}
    >
      <Container maxWidth="lg">
        <Typography
          variant="h2"
          sx={{
            textAlign: "center",
            color: "#fff",
            fontWeight: 800,
            mb: 6,
            textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
            animation: `${float} 3s ease-in-out infinite`,
            fontSize: { xs: "2rem", md: "3rem" },
          }}
        >
          <FitnessCenter
            sx={{
              fontSize: { xs: 40, md: 50 }, // Mobilde 40px, masaüstünde 50px
              verticalAlign: "middle",
              mr: 2,
            }}
          />
          Egzersiz Yönetimi
        </Typography>

        <GlowingCard glowColor="#2196F3" sx={{ p: 4, mb: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 4,
            }}
          >
            <Typography variant="h5" sx={{ color: "#fff", fontWeight: 700 }}>
              Egzersiz Kütüphanesi
            </Typography>
            <AnimatedButton
              startIcon={<Add />}
              onClick={() => {
                setCustomExercise({
                  id: null,
                  title: "",
                  target: "",
                  equipment: "",
                  instructions: "",
                });
                setOpenModal(true);
              }}
              sx={{
                padding: { xs: "6px 14px", md: "12px 30px" },
                fontSize: { xs: "0.6rem", md: "inherit" },
              }}
            >
              Yeni Egzersiz Ekle
            </AnimatedButton>
          </Box>

          <Dialog
            open={openModal}
            onClose={() => setOpenModal(false)}
            fullWidth
            maxWidth="lg"
            PaperProps={{
              sx: {
                background: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(10px)",
                borderRadius: "24px",
                border: "1px solid rgba(33, 150, 243, 0.2)",
              },
            }}
          >
            <DialogTitle sx={{ fontWeight: 700 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {modalType === "api"
                  ? "Egzersiz Ara ve Ekle"
                  : "Özel Egzersiz Oluştur"}
                <IconButton onClick={() => setOpenModal(false)}>
                  <Close sx={{ color: "#2196F3" }} />
                </IconButton>
              </Box>
            </DialogTitle>

            <DialogContent>
              {modalType === "api" ? (
                <>
                  <Grid container spacing={3} sx={{ mt: 2 }}>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel>Vücut Bölgesi</InputLabel>
                        <Select
                          value={filters.bodyPart}
                          onChange={(e) =>
                            setFilters({ ...filters, bodyPart: e.target.value })
                          }
                          sx={{ background: "rgba(255,255,255,0.8)" }}
                        >
                          {BODY_PARTS.map((part) => (
                            <MenuItem key={part} value={part}>
                              {TRANSLATIONS.bodyParts[part]}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel>Ekipman</InputLabel>
                        <Select
                          value={filters.equipment}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              equipment: e.target.value,
                            })
                          }
                          sx={{ background: "rgba(255,255,255,0.8)" }}
                        >
                          {EQUIPMENTS.map((eq) => (
                            <MenuItem key={eq} value={eq}>
                              {TRANSLATIONS.equipment[eq]}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Egzersiz Adı Ara"
                        value={filters.name}
                        onChange={(e) =>
                          setFilters({ ...filters, name: e.target.value })
                        }
                        fullWidth
                        sx={{ background: "rgba(255,255,255,0.8)" }}
                      />
                    </Grid>
                  </Grid>

                  <AnimatedButton
                    fullWidth
                    onClick={fetchExercises}
                    disabled={loading}
                    sx={{ my: 3 }}
                  >
                    Egzersizleri Getir
                  </AnimatedButton>

                  {loading && (
                    <CircularProgress
                      sx={{
                        display: "block",
                        margin: "20px auto",
                        color: "#2196F3",
                      }}
                    />
                  )}

                  {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      {error}
                    </Alert>
                  )}

                  <Grid container spacing={3}>
                    {apiExercises.map((exercise) => (
                      <Grid item xs={12} md={6} key={exercise.id}>
                        <GlowingCard glowColor="#4CAF50" sx={{ p: 3 }}>
                          <Typography
                            variant="h6"
                            sx={{ color: "#fff", mb: 1 }}
                          >
                            {exercise.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ color: "#fff", opacity: 0.9 }}
                          >
                            Hedef: {exercise.target}
                          </Typography>
                          <Box sx={{ maxHeight: 100, overflow: "auto", my: 2 }}>
                            {exercise.instructions?.map((step, i) => (
                              <Typography
                                key={i}
                                variant="body2"
                                sx={{ color: "#fff" }}
                              >
                                {i + 1}. {step}
                              </Typography>
                            ))}
                          </Box>
                          <AnimatedButton
                            fullWidth
                            onClick={() => {
                              setExercises((prev) => [
                                ...prev,
                                {
                                  id: Date.now().toString(),
                                  title: exercise.name,
                                  content: `Hedef: ${
                                    exercise.target
                                  }\nEkipman: ${
                                    exercise.equipment
                                  }\nTalimatlar:\n${exercise.instructions
                                    ?.map((s, i) => `${i + 1}. ${s}`)
                                    .join("\n")}`,
                                },
                              ]);
                              toast.success("Egzersiz eklendi!");
                            }}
                          >
                            Programıma Ekle
                          </AnimatedButton>
                        </GlowingCard>
                      </Grid>
                    ))}
                  </Grid>

                  <Box sx={{ textAlign: "center", mt: 3 }}>
                    <AnimatedButton
                      variant="text"
                      onClick={() => setModalType("custom")}
                      sx={{ color: "#2196F3" }}
                    >
                      Özel Egzersiz Oluştur
                    </AnimatedButton>
                  </Box>
                </>
              ) : (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    label="Egzersiz Adı*"
                    fullWidth
                    value={customExercise.title}
                    onChange={(e) =>
                      setCustomExercise({
                        ...customExercise,
                        title: e.target.value,
                      })
                    }
                    sx={{ mb: 2, background: "rgba(255,255,255,0.8)" }}
                  />

                  <TextField
                    label="Hedef Bölge"
                    fullWidth
                    value={customExercise.target}
                    onChange={(e) =>
                      setCustomExercise({
                        ...customExercise,
                        target: e.target.value,
                      })
                    }
                    sx={{ mb: 2, background: "rgba(255,255,255,0.8)" }}
                  />

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Ekipman</InputLabel>
                    <Select
                      value={customExercise.equipment}
                      onChange={(e) =>
                        setCustomExercise({
                          ...customExercise,
                          equipment: e.target.value,
                        })
                      }
                      sx={{ background: "rgba(255,255,255,0.8)" }}
                    >
                      {EQUIPMENTS.map((eq) => (
                        <MenuItem key={eq} value={eq}>
                          {TRANSLATIONS.equipment[eq]}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label="Talimatlar*"
                    multiline
                    rows={4}
                    fullWidth
                    value={customExercise.instructions}
                    onChange={(e) =>
                      setCustomExercise({
                        ...customExercise,
                        instructions: e.target.value,
                      })
                    }
                    placeholder="Her bir talimatı yeni satıra yazın"
                    sx={{ background: "rgba(255,255,255,0.8)" }}
                  />

                  <Box
                    sx={{
                      mt: 3,
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 2,
                    }}
                  >
                    <AnimatedButton
                      variant="outlined"
                      onClick={() => setModalType("api")}
                      sx={{ borderColor: "#2196F3", color: "#2196F3" }}
                    >
                      Geri Dön
                    </AnimatedButton>
                    <AnimatedButton onClick={handleSubmitCustomExercise}>
                      {customExercise.id ? "Güncelle" : "Kaydet"}
                    </AnimatedButton>
                  </Box>
                </Box>
              )}
            </DialogContent>
          </Dialog>

          {exercises.length === 0 ? (
            <Box
              sx={{
                textAlign: "center",
                p: 4,
                border: `2px dashed rgba(255,255,255,0.3)`,
                borderRadius: 3,
              }}
            >
              <Typography variant="h6" sx={{ color: "#fff", opacity: 0.8 }}>
                Henüz egzersiz eklenmemiş
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {exercises.map((exercise) => (
                <Grid item xs={12} md={6} lg={4} key={exercise.id}>
                  <GlowingCard
                    glowColor="#A6F6FF"
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      color: "aliceblue",
                      p: 3,
                      transition: "transform 0.3s, box-shadow 0.3s",
                      "&:hover": {
                        transform: "translateY(-5px)",
                      },
                    }}
                  >
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography
                        variant="h6"
                        onClick={() =>
                          setExpandedId(
                            expandedId === exercise.id ? null : exercise.id
                          )
                        }
                        sx={{
                          color: "#fff",
                          cursor: "pointer",
                          flexGrow: 1,
                          fontWeight: 600,
                        }}
                      >
                        {exercise.title}
                      </Typography>
                      <Box>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            const instructions = exercise.content
                              .split("Talimatlar:\n")[1]
                              ?.split("\n")
                              .map((line) => line.replace(/^\d+\.\s*/, ""))
                              .join("\n");

                            setCustomExercise({
                              id: exercise.id,
                              title: exercise.title,
                              target:
                                exercise.content.match(/Hedef: (.*)/)?.[1] ||
                                "",
                              equipment:
                                exercise.content.match(/Ekipman: (.*)/)?.[1] ||
                                "",
                              instructions: instructions || "",
                            });
                            setModalType("custom");
                            setOpenModal(true);
                          }}
                          sx={{ color: "#fff" }}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            setExercises(
                              exercises.filter((e) => e.id !== exercise.id)
                            );
                          }}
                          sx={{ color: "#FF5252" }}
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </Box>

                    <Collapse in={expandedId === exercise.id}>
                      <Typography
                        sx={{
                          whiteSpace: "pre-line",
                          mt: 2,
                          color: "#fff",
                          opacity: 0.9,
                        }}
                      >
                        {exercise.content.split("\n").map((line, i) => (
                          <span key={i} style={{ display: "block" }}>
                            {line.startsWith("Hedef:") ||
                            line.startsWith("Ekipman:") ||
                            line.startsWith("Talimatlar:") ? (
                              <strong>{line}</strong>
                            ) : (
                              line
                            )}
                          </span>
                        ))}
                      </Typography>
                    </Collapse>
                  </GlowingCard>
                </Grid>
              ))}
            </Grid>
          )}
        </GlowingCard>
      </Container>
    </Box>
  );
};

export default Exercises;
