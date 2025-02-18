import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Button,
  Chip,
  useTheme,
} from "@mui/material";
import { Delete, Edit, FitnessCenter, Add } from "@mui/icons-material";
import { ExerciseForm } from "../../utils/Forms";
import axios from "axios";
import { toast } from "react-toastify";

// Türkçe çeviri sözlüğü
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
    barbell: "Halter",
    dumbbell: "Dambıl",
    bodyweight: "Vücut Ağırlığı",
    cable: "Kablo Makinesi",
    machine: "Ağırlık Makinesi",
    bands: "Direnç Bandı",
    "leverage machine": "Kaldıraç Makinesi",
    kettlebell: "Kettlebell",
    "medicine ball": "Medikal Top",
    "exercise ball": "Egzersiz Topu",
    ezBarbell: "EZ Bar",
    weighted: "Ağırlıklı",
    roller: "Rulo",
    "resistance band": "Direnç Bandı",
    "skierg machine": "Kayak Makinesi",
    "sled machine": "Kızak Makinesi",
    "wheel roller": "Tekerlek Rulo",
  },
  target: {
    lats: "Kanat Kasları",
    chest: "Göğüs Kasları",
    quads: "Quadriceps",
    hamstrings: "Hamstring",
    shoulders: "Omuz Kasları",
    biceps: "Biceps",
    triceps: "Triceps",
    abs: "Karın Kasları",
    calves: "Baldır Kasları",
    glutes: "Kalça Kasları",
    traps: "Trapez Kasları",
    "upper back": "Üst Sırt",
    "lower back": "Alt Sırt",
    adductors: "Addüktör Kaslar",
    abductors: "Abdüktör Kaslar",
    forearms: "Önkol Kasları",
    "serratus anterior": "Serratus Anterior",
    levatorScapulae: "Levator Skapula",
  },
};

const Exercises = ({
  exercises,
  setExercises,
  handleExerciseSubmit,
  editingExercise,
  setEditingExercise,
}) => {
  const theme = useTheme();
  const [selectedBodyPart, setSelectedBodyPart] = useState("");
  const [apiExercises, setApiExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const BODY_PARTS = [
    "chest",
    "back",
    "legs",
    "shoulders",
    "arms",
    "core",
    "cardio",
  ];

  const API_URL = "https://exercisedb.p.rapidapi.com/exercises/bodyPart/";
  const API_OPTIONS = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": import.meta.env.VITE_XRAPID_API_KEY,
      "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
    },
  };

  const fetchExercises = async (bodyPart) => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get(`${API_URL}${bodyPart}`, API_OPTIONS);
      const results = response.data;
      const filteredExercises = results
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 4) + 5);
      setApiExercises(filteredExercises);
    } catch (err) {
      setError("Egzersizler yüklenirken hata oluştu");
      console.error("API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExercise = (exercise) => {
    const translatedExercise = {
      ...exercise,
      equipment:
        TRANSLATIONS.equipment[exercise.equipment] || exercise.equipment,
      target: TRANSLATIONS.target[exercise.target] || exercise.target,
    };

    const newExercise = {
      id: Date.now().toString(),
      title: translatedExercise.name,
      content: `Hedef: ${translatedExercise.target}\nEkipman: ${
        translatedExercise.equipment
      }\nTalimatlar:\n${translatedExercise.instructions
        .slice(0, 3)
        .map((step, index) => `${index + 1}. ${step}`)
        .join("\n")}`,
    };

    setExercises((prev) => [...prev, newExercise]);
    toast.success("Egzersiz listenize eklendi!");
  };

  useEffect(() => {
    if (selectedBodyPart) {
      fetchExercises(selectedBodyPart);
    }
  }, [selectedBodyPart]);

  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 4,
        boxShadow: theme.shadows[3],
        background: theme.palette.background.paper,
      }}
    >
      <Typography
        variant="h4"
        sx={{
          mb: 4,
          display: "flex",
          alignItems: "center",
          gap: 2,
          color: theme.palette.primary.main,
          fontWeight: 700,
        }}
      >
        <FitnessCenter fontSize="large" />
        Egzersiz Yönetim Paneli
      </Typography>

      {/* Vücut Bölgesi Seçimi */}
      <Box sx={{ mb: 4, maxWidth: 400 }}>
        <FormControl fullWidth>
          <InputLabel>Vücut Bölgesi Seçin</InputLabel>
          <Select
            value={selectedBodyPart}
            onChange={(e) => setSelectedBodyPart(e.target.value)}
            label="Vücut Bölgesi Seçin"
            variant="outlined"
          >
            {BODY_PARTS.map((part) => (
              <MenuItem key={part} value={part}>
                {TRANSLATIONS.bodyParts[part]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* API'den Gelen Egzersizler */}
      {selectedBodyPart && (
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h5"
            sx={{
              mb: 3,
              color: theme.palette.secondary.main,
              borderBottom: `2px solid ${theme.palette.secondary.main}`,
              pb: 1,
            }}
          >
            {TRANSLATIONS.bodyParts[selectedBodyPart]} Egzersiz Önerileri
          </Typography>

          {loading && (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <CircularProgress size={60} thickness={4} />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && (
            <Grid container spacing={3}>
              {apiExercises.map((exercise) => (
                <Grid item xs={12} md={6} lg={4} key={exercise.id}>
                  <Paper
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      transition: "all 0.3s ease",
                      boxShadow: theme.shadows[2],
                      "&:hover": {
                        transform: "translateY(-5px)",
                        boxShadow: theme.shadows[6],
                      },
                    }}
                  >
                    <Chip
                      label={
                        TRANSLATIONS.equipment[
                          exercise.equipment.toLowerCase()
                        ] || exercise.equipment
                      }
                      color="secondary"
                      size="small"
                      sx={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    />
                    <Typography
                      variant="h6"
                      sx={{
                        mb: 1.5,
                        fontWeight: 700,
                        color: theme.palette.text.primary,
                      }}
                    >
                      {exercise.name}
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Chip
                        label={`Hedef: ${
                          TRANSLATIONS.target[exercise.target] ||
                          exercise.target
                        }`}
                        color="primary"
                        size="small"
                        sx={{ mr: 1 }}
                      />
                    </Box>

                    <Box sx={{ flexGrow: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: "pre-line",
                          lineHeight: 1.6,
                          color: theme.palette.text.secondary,
                        }}
                      >
                        {exercise.instructions
                          .slice(0, 3)
                          .map((step, index) => (
                            <div key={index}>
                              <strong>{index + 1}.</strong> {step}
                            </div>
                          ))}
                      </Typography>
                    </Box>

                    <Button
                      startIcon={<Add />}
                      onClick={() => handleAddExercise(exercise)}
                      sx={{
                        mt: 2,
                        alignSelf: "flex-start",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                      variant="contained"
                      color="primary"
                    >
                      Listeye Ekle
                    </Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Kullanıcı Egzersiz Formu */}
      <ExerciseForm
        onSubmit={handleExerciseSubmit}
        initialData={editingExercise}
        setEditingSupplement={setEditingExercise}
      />

      {/* Kişisel Egzersiz Listesi */}
      {exercises.length === 0 ? (
        <Box
          sx={{
            textAlign: "center",
            py: 4,
            border: `2px dashed ${theme.palette.divider}`,
            borderRadius: 3,
            mt: 4,
          }}
        >
          <img
            src="/empty-state.svg"
            alt="Boş liste"
            style={{ height: 150, opacity: 0.8 }}
          />
          <Typography
            variant="h6"
            sx={{
              mt: 2,
              color: theme.palette.text.secondary,
            }}
          >
            Henüz egzersiz eklenmemiş
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {exercises.map((exercise) => (
            <Grid item xs={12} md={6} lg={4} key={exercise.id}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.3s ease",
                  boxShadow: theme.shadows[2],
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: theme.shadows[4],
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 2,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: theme.palette.primary.main,
                    }}
                  >
                    {exercise.title}
                  </Typography>
                  <Box>
                    <IconButton
                      onClick={() => setEditingExercise(exercise)}
                      sx={{ color: theme.palette.primary.main }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      onClick={() =>
                        setExercises(
                          exercises.filter((e) => e.id !== exercise.id)
                        )
                      }
                      sx={{ color: theme.palette.error.main }}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>

                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: "pre-line",
                    lineHeight: 1.6,
                    flexGrow: 1,
                    color: theme.palette.text.secondary,
                    "& strong": {
                      color: theme.palette.text.primary,
                    },
                  }}
                >
                  {exercise.content.split("\n").map((line, index) => (
                    <div key={index}>
                      {line.startsWith("Hedef:") ? (
                        <strong>{line}</strong>
                      ) : line.startsWith("Ekipman:") ? (
                        <strong>{line}</strong>
                      ) : line.startsWith("Talimatlar:") ? (
                        <strong>{line}</strong>
                      ) : (
                        line
                      )}
                    </div>
                  ))}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Paper>
  );
};

export default Exercises;
