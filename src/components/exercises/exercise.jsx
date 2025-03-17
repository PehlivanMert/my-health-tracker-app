import React, { useState, useEffect } from "react";
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
  Container,
  styled,
  keyframes,
  Button,
} from "@mui/material";
import { Delete, Edit, FitnessCenter, Add, Close } from "@mui/icons-material";
import axios from "axios";
import { toast } from "react-toastify";

// Çeviri nesnesi: bodyParts, equipment ve targets
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
  targets: {
    abs: "Karın",
    biceps: "Biseps",
    triceps: "Triseps",
    shoulders: "Omuzlar",
    "upper back": "Üst Sırt",
    "lower back": "Alt Sırt",
    glutes: "Kalça",
    quads: "Quadriceps",
    hamstrings: "Arka Bacak",
  },
};

// TARGETS dizisini, hedef kas grubu seçenekleri için oluşturuyoruz.
const TARGETS = Object.keys(TRANSLATIONS.targets);

// API'nin beklediği bodyPart değerlerine göre mapping
const BODY_PART_MAPPING = {
  chest: "chest",
  back: "back",
  legs: "lower legs", // API, "legs" yerine "lower legs" bekleyebilir.
  shoulders: "shoulders",
  arms: "upper arms", // API "arms" için "upper arms" bekleyebilir.
  core: "waist", // "core" yerine "waist" kullanılması gerekebilir.
  cardio: "cardio",
};

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;

const isIOS = () =>
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent);

const GlowingCard = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$glowColor",
})(({ theme, $glowColor }) => {
  const ios = isIOS();
  return {
    background: ios ? "rgba(255,255,255,0.1)" : "rgba(255, 255, 255, 0.1)",
    color: "#fff",
    borderRadius: "24px",
    WebkitBackdropFilter: ios ? "none" : "blur(10px)",
    backdropFilter: ios ? "none" : "blur(10px)",
    boxShadow: `0 0 20px ${$glowColor || "#2196F322"}`,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": {
      transform: "translateY(-5px)",
      boxShadow: `0 0 40px ${$glowColor || "#2196F344"}`,
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
    target: "",
  });
  const [customExercise, setCustomExercise] = useState({
    id: null,
    title: "",
    target: "",
    equipment: "",
    instructions: "",
    gifUrl: "",
  });

  const BODY_PARTS = Object.keys(TRANSLATIONS.bodyParts);
  const EQUIPMENTS = Object.keys(TRANSLATIONS.equipment);

  // Düzeltilmiş API yapılandırması
  const API_BASE_URL = "https://exercisedb.p.rapidapi.com/exercises";
  const API_OPTIONS = {
    headers: {
      "X-RapidAPI-Key": import.meta.env.VITE_XRAPID_API_KEY,
      "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
    },
    timeout: 10000,
  };

  const capitalizeWords = (str) => {
    return str
      .split(/[\s-]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const translateExerciseBatch = async (exercises) => {
    try {
      const response = await axios.post(
        "https://google-translate113.p.rapidapi.com/api/v1/translator/json",
        {
          from: "auto",
          to: "tr",
          protected_paths: ["gifUrl"],
          json: { exercises },
        },
        {
          headers: {
            "x-rapidapi-key": import.meta.env.VITE_XRAPID_API_KEY,
            "x-rapidapi-host": "google-translate113.p.rapidapi.com",
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      // API yanıt yapısını düzgün şekilde alıyoruz
      return response.data.trans.exercises || exercises;
    } catch (error) {
      console.error("Toplu çeviri hatası:", error);
      return exercises;
    }
  };

  const fetchExercises = async () => {
    try {
      setLoading(true);
      setError("");

      let url = API_BASE_URL;
      let endpointUsed = "";

      // Seçilen filtrelerden kaç tanesi dolu?
      const activeFiltersCount = Object.values(filters).filter(
        (val) => val !== ""
      ).length;

      if (activeFiltersCount > 1) {
        // Birden fazla filtre seçilmişse; genel endpoint ile tüm egzersizleri çekip, sonrasında client-side filtre uyguluyoruz.
        url = API_BASE_URL;
        endpointUsed = "general";
      } else {
        // Tek filtre seçilmişse, ilgili endpoint'i kullanıyoruz.
        if (filters.name) {
          url = `${API_BASE_URL}/name/${filters.name}`;
          endpointUsed = "name";
        } else if (filters.target) {
          url = `${API_BASE_URL}/target/${filters.target}`;
          endpointUsed = "target";
        } else if (filters.equipment) {
          url = `${API_BASE_URL}/equipment/${filters.equipment}`;
          endpointUsed = "equipment";
        } else if (filters.bodyPart) {
          // UI'dan gelen bodyPart değerini API'nin beklediği değere dönüştürüyoruz.
          const apiBodyPart =
            BODY_PART_MAPPING[filters.bodyPart] || filters.bodyPart;
          url = `${API_BASE_URL}/bodyPart/${apiBodyPart}`;
          endpointUsed = "bodyPart";
        }
      }

      const response = await axios.get(url, API_OPTIONS);
      let exercisesData = response.data;

      // Eğer endpoint "name" değilse, yani tek filtre veya genel endpoint kullanıldıysa,
      // client-side filtreleme uyguluyoruz.
      if (endpointUsed !== "name") {
        if (filters.bodyPart) {
          exercisesData = exercisesData.filter(
            (ex) =>
              (ex.bodyPart || "").toLowerCase() ===
              (
                BODY_PART_MAPPING[filters.bodyPart] || filters.bodyPart
              ).toLowerCase()
          );
        }
        if (filters.equipment) {
          exercisesData = exercisesData.filter(
            (ex) =>
              (ex.equipment || "").toLowerCase() ===
              filters.equipment.toLowerCase()
          );
        }
        if (filters.target) {
          exercisesData = exercisesData.filter(
            (ex) =>
              (ex.target || "").toLowerCase() === filters.target.toLowerCase()
          );
        }
        if (filters.name) {
          exercisesData = exercisesData.filter((ex) =>
            (ex.name || "").toLowerCase().includes(filters.name.toLowerCase())
          );
        }
      }

      // Toplu çeviri işlemi (gerekirse)
      const translatedExercises = await translateExerciseBatch(exercisesData);
      const processedExercises = exercisesData.map((ex, index) => ({
        ...ex,
        name: translatedExercises[index]?.name || ex.name,
        target: translatedExercises[index]?.target || ex.target,
        equipment: translatedExercises[index]?.equipment || ex.equipment,
        instructions:
          translatedExercises[index]?.instructions || ex.instructions,
        gifUrl: ex.gifUrl,
      }));

      // Egzersiz listesini rastgele sıraya koyuyoruz.
      const shuffledExercises = processedExercises.sort(
        () => Math.random() - 0.5
      );

      setApiExercises(shuffledExercises);
    } catch (err) {
      setError(
        "Egzersizler yüklenirken hata oluştu. Lütfen daha sonra tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
  };

  const renderExerciseCard = (exercise, isInModal = true) => (
    <GlowingCard
      $glowColor="#4CAF50"
      sx={{
        p: 3,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s ease",
      }}
    >
      <Typography
        variant="h6"
        sx={{
          color: "#fff",
          mb: 1,
          minHeight: "3em",
          display: "flex",
          alignItems: "center",
        }}
      >
        {exercise.name}
      </Typography>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* GIF Container */}
        <Box
          sx={{
            position: "relative",
            paddingTop: "56.25%",
            borderRadius: "12px",
            overflow: "hidden",
            mb: 2,
            border: "2px solid rgba(255,255,255,0.1)",
          }}
        >
          <img
            src={exercise.gifUrl}
            alt={exercise.name}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              backgroundColor: "#000",
            }}
          />
        </Box>

        {/* Sadece modal dışında talimatları göster */}
        {!isInModal && (
          <Collapse in={expandedId === exercise.id}>
            <Box
              sx={{
                maxHeight: 200,
                overflow: "auto",
                mb: 2,
                backgroundColor: "rgba(0,0,0,0.2)",
                borderRadius: "8px",
                p: 2,
              }}
            >
              <Typography
                variant="body2"
                sx={{ color: "#fff", fontWeight: 500, mb: 1 }}
              >
                Talimatlar:
              </Typography>
              {exercise.instructions?.map((step, i) => (
                <Typography
                  key={i}
                  variant="body2"
                  sx={{
                    color: "#fff",
                    mb: 1,
                    "&:last-child": { mb: 0 },
                  }}
                >
                  {i + 1}. {step}
                </Typography>
              ))}
            </Box>
          </Collapse>
        )}

        <AnimatedButton
          fullWidth
          onClick={() => handleAddExercise(exercise)}
          sx={{
            mt: "auto",
            visibility: isInModal ? "visible" : "hidden",
            "&:hover": {
              transform: isInModal ? "scale(1.03)" : "none",
            },
          }}
        >
          Programıma Ekle
        </AnimatedButton>
      </Box>
    </GlowingCard>
  );

  const handleAddExercise = (exercise) => {
    const newExercise = {
      id: Date.now().toString(),
      title: exercise.name,
      content: `Hedef: ${exercise.target}\nEkipman: ${
        exercise.equipment
      }\nTalimatlar:\n${
        Array.isArray(exercise.instructions)
          ? exercise.instructions.map((s, i) => `${i + 1}. ${s}`).join("\n")
          : exercise.instructions
      }`,
      gifUrl: exercise.gifUrl,
    };

    setExercises((prev) => [...prev, newExercise]);
    toast.success("Egzersiz programınıza eklendi!");
    setOpenModal(false); // Modal'ı kapat
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

        <GlowingCard $glowColor="#2196F3" sx={{ p: 4, mb: 4 }}>
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
                    <Grid item xs={12} md={3}>
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

                    <Grid item xs={12} md={3}>
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

                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth>
                        <InputLabel>Hedef Kas Grubu</InputLabel>
                        <Select
                          value={filters.target}
                          onChange={(e) =>
                            setFilters({ ...filters, target: e.target.value })
                          }
                          sx={{ background: "rgba(255,255,255,0.8)" }}
                        >
                          {TARGETS.map((tar) => (
                            <MenuItem key={tar} value={tar}>
                              {tar.charAt(0).toUpperCase() + tar.slice(1)}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={3}>
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
                        {renderExerciseCard(exercise, true)}
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
              <Box sx={{ mt: 2 }}>
                <img
                  src="/empty-state.svg"
                  alt="Empty State"
                  style={{
                    maxWidth: "20%",
                    height: "auto",
                    minWidth: "100px", // Küçük ekranlarda çok küçülmesini önler
                  }}
                />
              </Box>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {exercises.map((exercise) => (
                <Grid item xs={12} md={6} lg={4} key={exercise.id}>
                  <GlowingCard
                    $glowColor="#A6F6FF"
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      color: "aliceblue",
                      p: 0,
                      transition: "transform 0.3s, box-shadow 0.3s",
                      background:
                        "linear-gradient(135deg, rgba(166,246,255,0.1) 0%, rgba(33,150,243,0.15) 100%)",
                      border: "none",
                      overflow: "hidden",
                      "&:hover": {
                        transform: "translateY(-5px)",
                        boxShadow: "0 8px 24px rgba(166,246,255,0.25)",
                      },
                    }}
                  >
                    {/* Başlık ve Aksiyon Butonları */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        p: 2,
                        background:
                          "linear-gradient(45deg, rgba(33,150,243,0.4) 0%, rgba(166,246,255,0.3) 100%)",
                        borderBottom: "1px solid rgba(255,255,255,0.1)",
                        cursor: "pointer",
                        minHeight: 100,
                      }}
                      onClick={() =>
                        setExpandedId(
                          expandedId === exercise.id ? null : exercise.id
                        )
                      }
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          color: "#fff",
                          flexGrow: 1,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          pr: 1,
                        }}
                      >
                        <FitnessCenter
                          sx={{ fontSize: 20, color: "#4CAF50" }}
                        />
                        {exercise.title}
                      </Typography>

                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton
                          size="small"
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
                          sx={{
                            color: "#fff",
                            "&:hover": {
                              background: "rgba(76,175,80,0.2)",
                              transform: "scale(1.1)",
                            },
                            transition: "all 0.2s",
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExercises(
                              exercises.filter((e) => e.id !== exercise.id)
                            );
                          }}
                          sx={{
                            color: "#FF5252",
                            "&:hover": {
                              background: "rgba(255,82,82,0.2)",
                              transform: "scale(1.1)",
                            },
                            transition: "all 0.2s",
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    <Collapse in={expandedId === exercise.id}>
                      <Box sx={{ p: 2.5 }}>
                        {/* Bilgi Grid'i */}
                        <Grid container spacing={1.5} sx={{ mb: 2 }}>
                          <Grid item xs={6}>
                            <Box
                              sx={{
                                background: "rgba(255,255,255,0.08)",
                                borderRadius: 1,
                                p: 1,
                                textAlign: "center",
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "#81D4FA",
                                  fontWeight: 500,
                                  display: "block",
                                }}
                              >
                                Hedef Bölge
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: "#fff",
                                  mt: 0.5,
                                  fontWeight: 500,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {exercise.content.match(/Hedef: (.*)/)?.[1] ||
                                  "-"}
                              </Typography>
                            </Box>
                          </Grid>

                          <Grid item xs={6}>
                            <Box
                              sx={{
                                background: "rgba(255,255,255,0.08)",
                                borderRadius: 1,
                                p: 1,
                                textAlign: "center",
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "#81D4FA",
                                  fontWeight: 500,
                                  display: "block",
                                }}
                              >
                                Ekipman
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: "#fff",
                                  mt: 0.5,
                                  fontWeight: 500,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {exercise.content.match(/Ekipman: (.*)/)?.[1] ||
                                  "-"}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>

                        {/* Talimatlar */}
                        <Box
                          sx={{
                            background: "rgba(0,0,0,0.12)",
                            borderRadius: 1.5,
                            p: 2,
                            mb: 2,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color: "#81D4FA",
                              fontWeight: 500,
                              mb: 1,
                            }}
                          >
                            Talimatlar:
                          </Typography>
                          {exercise.content.split("\n").map(
                            (line, i) =>
                              !line.startsWith("Hedef:") &&
                              !line.startsWith("Ekipman:") &&
                              !line.startsWith("Talimatlar:") && (
                                <Typography
                                  key={i}
                                  variant="body2"
                                  sx={{
                                    color: "#fff",
                                    fontSize: "0.85rem",
                                    position: "relative",
                                    pl: 2.5,
                                    mb: 1,
                                    "&:before": {
                                      content: '"•"',
                                      position: "absolute",
                                      left: 0,
                                      top: 0,
                                      color: "#4CAF50",
                                      fontWeight: "bold",
                                    },
                                  }}
                                >
                                  {line.replace(/^\d+\.\s*/, "")}
                                </Typography>
                              )
                          )}
                        </Box>

                        {/* GIF Görseli */}
                        {exercise.gifUrl && (
                          <Box
                            sx={{
                              position: "relative",
                              paddingTop: "56.25%",
                              borderRadius: "12px",
                              overflow: "hidden",
                              border: "1px solid rgba(255,255,255,0.12)",
                            }}
                          >
                            <img
                              src={exercise.gifUrl}
                              alt={exercise.title}
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                backgroundColor: "#000",
                              }}
                            />
                          </Box>
                        )}
                      </Box>
                    </Collapse>

                    {/* Kapalı durumda alt çizgi */}
                    {expandedId !== exercise.id && (
                      <Box
                        sx={{
                          height: 4,
                          background:
                            "linear-gradient(90deg, rgba(33,150,243,0.6) 0%, rgba(166,246,255,0.4) 100%)",
                          opacity: 0.4,
                        }}
                      />
                    )}
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
