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
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Delete, Edit } from "@mui/icons-material";
import ProgressChart from "../../utils/ProgressChart";

const DailyRoutine = ({
  routines,
  setRoutines, // ✅ Bu satırı ekleyin
  newRoutine,
  setNewRoutine,
  handleSaveRoutine,
  editRoutineId,
  setEditRoutineId,
  onDragEnd,
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

      {/* Rutinlerin Listelenmesi ve Sıralanması */}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="routines">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              style={{ minHeight: "100px" }} // ✅ Boş liste için minimum yükseklik
            >
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
                routines.map((routine, index) => (
                  <Draggable
                    key={routine.id}
                    draggableId={routine.id}
                    index={index}
                  >
                    {(provided) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          p: 2,
                          mb: 1,
                          background:
                            "linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)",
                          borderRadius: 2,
                          transition: "transform 0.2s ease-in-out",
                          "&:hover": {
                            transform: "translateY(-3px)",
                            boxShadow: 3,
                          },
                        }}
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
                          <Typography variant="body1">
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
                      </Box>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

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
