import React from "react";
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  IconButton,
  Checkbox,
} from "@mui/material";
import { Delete, Edit } from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import ProgressChart from "../../utils/ProgressChart";

const DailyRoutine = ({
  routines,
  setRoutines,
  newRoutine,
  setNewRoutine,
  handleSaveRoutine,
  editRoutineId,
  setEditRoutineId,
  deleteRoutine,
  completedRoutines,
  totalRoutines,
}) => {
  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
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
        ⏰ Günlük Rutin
      </Typography>

      {/* Rutin Ekleme Formu */}
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <TextField
          id="routine-time"
          name="time"
          label="Saat"
          type="time"
          value={newRoutine.time}
          onChange={(e) =>
            setNewRoutine({ ...newRoutine, time: e.target.value })
          }
        />
        <TextField
          id="routine-title"
          name="title"
          label="Rutin Açıklaması"
          placeholder="Rutin açıklaması"
          value={newRoutine.title}
          onChange={(e) =>
            setNewRoutine({ ...newRoutine, title: e.target.value })
          }
          sx={{ flex: 1 }}
        />
        <Button
          variant="contained"
          onClick={handleSaveRoutine}
          disabled={!newRoutine.title}
        >
          {editRoutineId ? "Güncelle" : "Ekle"}
        </Button>
      </Box>

      {/* Rutinlerin Listelenmesi */}
      <Box sx={{ minHeight: "100px" }}>
        {routines.length === 0 ? (
          <Box
            sx={{
              textAlign: "center",
              py: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <img
              src="/empty-state.svg"
              alt="Boş rutin"
              style={{ height: 150, opacity: 0.8 }}
            />
            <Typography variant="h6" color="textSecondary">
              Henüz rutin eklenmemiş
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Yukarıdaki formu kullanarak yeni rutinler ekleyebilirsiniz
            </Typography>
          </Box>
        ) : (
          <AnimatePresence>
            {routines.map((routine) => (
              <motion.div
                key={routine.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Paper
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    p: 2,
                    mb: 1,
                    borderRadius: 2,
                    transition:
                      "transform 0.2s ease-in-out, box-shadow 0.3s ease-in-out",
                    background: routine.checked
                      ? "rgba(0, 0, 0, 0.05)"
                      : "transparent", // Seçilen öğe için daha soluk bir arka plan
                    boxShadow: routine.checked
                      ? "none"
                      : "0px 2px 4px rgba(0, 0, 0, 0.1)", // Seçilen öğe için gölge yok
                    "&:hover": {
                      transform: "translateY(-3px)",
                      boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)", // Hover durumunda biraz daha belirgin gölge
                    },
                    textDecoration: routine.checked ? "line-through" : "none", // Seçilen rutin için yazı üstü çizili
                    opacity: routine.checked ? 0.6 : 1, // Seçilen rutin için daha soluk
                  }}
                  elevation={3}
                >
                  <Checkbox
                    checked={routine.checked}
                    onChange={() =>
                      setRoutines(
                        routines.map((r) =>
                          r.id === routine.id
                            ? { ...r, checked: !r.checked }
                            : r
                        )
                      )
                    }
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="body1"
                      sx={{ opacity: routine.checked ? 0.6 : 1 }}
                    >
                      {routine.time} | {routine.title}
                    </Typography>
                  </Box>
                  <IconButton
                    onClick={() => {
                      setNewRoutine(routine);
                      setEditRoutineId(routine.id);
                    }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton onClick={() => deleteRoutine(routine.id)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Paper>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </Box>

      {/* Rutin İlerleme Grafiği */}
      <ProgressChart
        completedRoutines={completedRoutines}
        totalRoutines={totalRoutines}
        sx={{
          mt: 4,
          mx: "auto",
          maxWidth: 400,
        }}
      />
    </Paper>
  );
};

export default DailyRoutine;
