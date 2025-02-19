import React, { useState } from "react";
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
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
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

const capitalizeWords = (str) => {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

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
    <Paper sx={{ p: 3, borderRadius: 4, boxShadow: theme.shadows[3] }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-end", sm: "center" }, // xs'te sağa dayalı olması için flex-end
          mb: 4,
          gap: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <FitnessCenter fontSize="large" />
          Egzersiz Yönetim Paneli
        </Typography>

        <Button
          variant="contained"
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
        >
          Yeni Egzersiz Ekle
        </Button>
      </Box>

      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
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
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {modalType === "api" ? (
            <>
              <Box
                sx={{
                  mt: 3,
                  display: "grid",
                  gap: 3,
                  gridTemplateColumns: "repeat(3, 1fr)",
                }}
              >
                <FormControl fullWidth>
                  <InputLabel>Vücut Bölgesi</InputLabel>
                  <Select
                    value={filters.bodyPart}
                    onChange={(e) =>
                      setFilters({ ...filters, bodyPart: e.target.value })
                    }
                  >
                    {BODY_PARTS.map((part) => (
                      <MenuItem key={part} value={part}>
                        {TRANSLATIONS.bodyParts[part]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Ekipman</InputLabel>
                  <Select
                    value={filters.equipment}
                    onChange={(e) =>
                      setFilters({ ...filters, equipment: e.target.value })
                    }
                  >
                    {EQUIPMENTS.map((eq) => (
                      <MenuItem key={eq} value={eq}>
                        {TRANSLATIONS.equipment[eq]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Egzersiz Adı Ara"
                  value={filters.name}
                  onChange={(e) =>
                    setFilters({ ...filters, name: e.target.value })
                  }
                />
              </Box>

              <Button
                variant="contained"
                onClick={fetchExercises}
                disabled={loading}
                fullWidth
                sx={{ my: 3 }}
              >
                Egzersizleri Getir
              </Button>

              {loading && (
                <CircularProgress
                  sx={{ display: "block", margin: "20px auto" }}
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
                    <Paper sx={{ p: 2, position: "relative" }}>
                      <Chip
                        label={exercise.equipment}
                        color="secondary"
                        size="small"
                        sx={{ position: "absolute", right: 8, top: 8 }}
                      />
                      <Typography variant="h6">{exercise.name}</Typography>
                      <Typography variant="body2">
                        Hedef: {exercise.target}
                      </Typography>
                      <Box sx={{ maxHeight: 100, overflow: "auto", my: 1 }}>
                        {exercise.instructions?.map((step, i) => (
                          <Typography key={i} variant="body2">
                            {i + 1}. {step}
                          </Typography>
                        ))}
                      </Box>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setExercises((prev) => [
                            ...prev,
                            {
                              id: Date.now().toString(),
                              title: exercise.name,
                              content: `Hedef: ${exercise.target}\nEkipman: ${
                                exercise.equipment
                              }\nTalimatlar:\n${exercise.instructions
                                ?.map((s, i) => `${i + 1}. ${s}`)
                                .join("\n")}`,
                            },
                          ]);
                          toast.success("Egzersiz eklendi!");
                        }}
                      >
                        Ekle
                      </Button>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <Box sx={{ textAlign: "center", mt: 3 }}>
                <Button variant="text" onClick={() => setModalType("custom")}>
                  Özel Egzersiz Oluştur
                </Button>
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
                sx={{ mb: 2 }}
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
                sx={{ mb: 2 }}
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
              />

              <Box
                sx={{
                  mt: 3,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 2,
                }}
              >
                <Button variant="outlined" onClick={() => setModalType("api")}>
                  Geri Dön
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSubmitCustomExercise}
                >
                  {customExercise.id ? "Güncelle" : "Kaydet"}
                </Button>
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
            border: `2px dashed ${theme.palette.divider}`,
          }}
        >
          <Typography variant="h6" color="textSecondary">
            Henüz egzersiz eklenmemiş
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {exercises.map((exercise) => (
            <Grid item xs={12} md={6} lg={4} key={exercise.id}>
              <Paper sx={{ p: 3, height: "100%", position: "relative" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography
                    variant="h6"
                    onClick={() =>
                      setExpandedId(
                        expandedId === exercise.id ? null : exercise.id
                      )
                    }
                    sx={{ cursor: "pointer", flexGrow: 1 }}
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
                            exercise.content.match(/Hedef: (.*)/)?.[1] || "",
                          equipment:
                            exercise.content.match(/Ekipman: (.*)/)?.[1] || "",
                          instructions: instructions || "",
                        });
                        setModalType("custom");
                        setOpenModal(true);
                      }}
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
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>

                <Collapse in={expandedId === exercise.id}>
                  <Typography sx={{ whiteSpace: "pre-line", mt: 2 }}>
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
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Paper>
  );
};

export default Exercises;
