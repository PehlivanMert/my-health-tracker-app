import React from "react";
import { Box, Paper, Typography, IconButton, Grid } from "@mui/material";
import { Delete, Edit } from "@mui/icons-material";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import { ExerciseForm } from "../../utils/Forms";

const Exercises = ({
  exercises,
  setExercises,
  handleExerciseSubmit,
  editingExercise,
  setEditingExercise,
}) => {
  return (
    <Paper sx={{ p: 3, borderRadius: 2, mb: 4 }}>
      <Typography
        variant="h5"
        sx={{
          mb: 4,
          display: "flex",
          alignItems: "center",
          gap: 1,
          color: "primary.main",
          fontWeight: "bold",
        }}
      >
        <FitnessCenterIcon fontSize="large" />
        Egzersiz Yönetimi
      </Typography>

      {/* Egzersiz Formu */}
      <ExerciseForm
        onSubmit={handleExerciseSubmit}
        initialData={editingExercise}
        setEditingSupplement={setEditingExercise}
      />

      {/* Egzersiz Kartları */}
      {exercises.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <img src="/empty-state.svg" alt="Boş" style={{ height: 150 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
            Henüz egzersiz eklenmemiş
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Yukarıdaki formu kullanarak yeni egzersizler ekleyebilirsiniz.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {exercises.map((exercise) => (
            <Grid item xs={12} md={6} key={exercise.id}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 2,
                  background:
                    "linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)",
                  transition:
                    "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: 3,
                  },
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {exercise.title}
                  </Typography>
                  <Box>
                    <IconButton onClick={() => setEditingExercise(exercise)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={() =>
                        setExercises(
                          exercises.filter((e) => e.id !== exercise.id)
                        )
                      }
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: "pre-line", fontFamily: "monospace" }}
                  >
                    {exercise.content}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Paper>
  );
};

export default Exercises;
