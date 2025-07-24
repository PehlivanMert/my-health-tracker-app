import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Paper,
  useTheme,
  useMediaQuery,
  Alert,
} from '@mui/material';
import {
  Close,
  ArrowForward,
  ArrowBack,
  Person,
  Notifications,
  FitnessCenter,
  Spa,
  Dashboard,
  WaterDrop,
  LocalHospital,
  EmojiEvents,
  SkipNext,
  CalendarMonth as CalendarMonthIcon,
  Timer,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../auth/firebaseConfig';

const OnboardingTour = ({ 
  open, 
  onClose, 
  user, 
  currentStep = 0,
  onStepChange,
  isDevMode = false 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [activeStep, setActiveStep] = useState(currentStep);
  const [isLoading, setIsLoading] = useState(false);

  const steps = [
    {
      title: "Profil Bilgileri",
      description: "Sağlık önerilerinizi kişiselleştirmek için profil bilgilerinizi tamamlayın.",
      icon: <Person />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            👤 Profil Bilgilerinizi Tamamlayın
          </Typography>
          <Typography variant="body1" paragraph>
            • İsim, soyisim ve doğum tarihinizi girin
          </Typography>
          <Typography variant="body1" paragraph>
            • Boy, kilo ve cinsiyet bilgilerinizi ekleyin
          </Typography>
          <Typography variant="body1" paragraph>
            • Bu bilgiler sağlık hedeflerinizi belirlemek için kullanılır
          </Typography>
          <Typography variant="body2" color="text.secondary">
            💡 Profil bilgileriniz güvenle saklanır ve sadece size özel öneriler için kullanılır.
          </Typography>
        </Box>
      )
    },
    {
      title: "Bildirim Ayarları",
      description: "Su içme ve takviye hatırlatmalarınızı özelleştirin.",
      icon: <Notifications />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            🔔 Bildirim Ayarlarınızı Yapılandırın
          </Typography>
          <Typography variant="body1" paragraph>
            • Su içme hatırlatmalarınızı ayarlayın
          </Typography>
          <Typography variant="body1" paragraph>
            • Takviye alma zamanlarınızı belirleyin
          </Typography>
          <Typography variant="body1" paragraph>
            • Bildirim penceresi saatlerini özelleştirin
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            💡 Akıllı bildirim sistemi hava durumuna göre hatırlatma sıklığını ayarlar.
          </Typography>
          <Alert severity="warning" sx={{ 
            bgcolor: 'rgba(255, 193, 7, 0.1)', 
            color: '#ffc107',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            '& .MuiAlert-icon': { color: '#ffc107' },
            mb: 2
          }}>
            ⚠️ Bildirimleri ayarlamazsanız akıllı su takibi çalışmaz!
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Bildirimleri istediğiniz zaman ayarlardan kapatabilirsiniz.
          </Typography>
        </Box>
      )
    },
    {
      title: "Rutin Sekmesi",
      description: "Günlük rutinlerinizi oluşturun ve takip edin.",
      icon: <FitnessCenter />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            🏃‍♂️ Günlük Rutinlerinizi Oluşturun
          </Typography>
          <Typography variant="body1" paragraph>
            • Egzersiz rutinlerinizi planlayın ve takip edin
          </Typography>
          <Typography variant="body1" paragraph>
            • Rutinlerinizi tekrarlayan veya tek seferlik olarak ayarlayın
          </Typography>
          <Typography variant="body1" paragraph>
            • Rutinlerinizi takvimde görüntüleyin ve ilerlemenizi takip edin
          </Typography>
          <Typography variant="body2" color="text.secondary">
            💡 Rutinlerinizi kategorilere ayırabilir ve öncelik sırası belirleyebilirsiniz.
          </Typography>
        </Box>
      )
    },
    {
      title: "Pomodoro Tekniği",
      description: "Odaklanmanızı artırmak için pomodoro tekniğini kullanın.",
      icon: <Timer />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            ⏰ Pomodoro Tekniği ile Odaklanın
          </Typography>
          <Typography variant="body1" paragraph>
            • 25 dakika çalışma + 5 dakika mola döngüsü
          </Typography>
          <Typography variant="body1" paragraph>
            • Uzun molalar için 4 pomodoro sonrası 15 dakika mola
          </Typography>
          <Typography variant="body1" paragraph>
            • Özelleştirilebilir süreler ve bildirimler
          </Typography>
          <Typography variant="body2" color="text.secondary">
            💡 Pomodoro tekniği üretkenliğinizi artırır ve odaklanmanızı güçlendirir.
          </Typography>
        </Box>
      )
    },
    {
      title: "Takvim Görünümü",
      description: "Rutinlerinizi takvimde görüntüleyin ve planlayın.",
      icon: <CalendarMonthIcon />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            📅 Takvim Görünümü
          </Typography>
          <Typography variant="body1" paragraph>
            • Günlük, haftalık ve aylık görünüm seçenekleri
          </Typography>
          <Typography variant="body1" paragraph>
            • Rutinlerinizi takvimde görüntüleyin ve düzenleyin
          </Typography>
          <Typography variant="body1" paragraph>
            • Geçmiş rutinlerinizi inceleyin ve istatistiklerinizi görün
          </Typography>
          <Typography variant="body2" color="text.secondary">
            💡 Takvim görünümü ile rutinlerinizi daha iyi planlayabilirsiniz.
          </Typography>
        </Box>
      )
    },
    {
      title: "Yaşam Sekmesi",
      description: "Su tüketimi ve takviye alımınızı takip edin.",
      icon: <WaterDrop />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            💧 Su ve Takviye Takibi
          </Typography>
          <Typography variant="body1" paragraph>
            • Günlük su tüketiminizi kaydedin
          </Typography>
          <Typography variant="body1" paragraph>
            • Takviyelerinizi alım geçmişini görün
          </Typography>
          <Typography variant="body1" paragraph>
            • İstatistiklerinizi analiz edin
          </Typography>
          <Typography variant="body2" color="text.secondary">
            💡 Hava durumuna göre su ihtiyacınız otomatik hesaplanır.
          </Typography>
        </Box>
      )
    },
    {
      title: "Sağlık Paneli",
      description: "Genel sağlık durumunuzu ve önerilerinizi görün.",
      icon: <LocalHospital />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            🏥 Sağlık Paneliniz
          </Typography>
          <Typography variant="body1" paragraph>
            • Günlük sağlık önerilerinizi alın
          </Typography>
          <Typography variant="body1" paragraph>
            • Hava durumuna göre tavsiyeler görün
          </Typography>
          <Typography variant="body1" paragraph>
            • Sağlık geçmişinizi takip edin
          </Typography>
          <Typography variant="body2" color="text.secondary">
            💡 AI destekli öneriler size özel sağlık tavsiyeleri sunar.
          </Typography>
        </Box>
      )
    },
    {
      title: "İstatistikler",
      description: "Detaylı istatistiklerinizi ve ilerlemenizi görün.",
      icon: <EmojiEvents />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            📊 İstatistiklerinizi Keşfedin
          </Typography>
          <Typography variant="body1" paragraph>
            • Su tüketim grafiklerinizi inceleyin
          </Typography>
          <Typography variant="body1" paragraph>
            • Takviye alım istatistiklerinizi görün
          </Typography>
          <Typography variant="body1" paragraph>
            • İlerlemenizi takip edin
          </Typography>
          <Typography variant="body2" color="text.secondary">
            💡 Haftalık ve aylık trendlerinizi analiz edin.
          </Typography>
        </Box>
      )
    }
  ];

  useEffect(() => {
    setActiveStep(currentStep);
  }, [currentStep]);

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      const newStep = activeStep + 1;
      setActiveStep(newStep);
      onStepChange?.(newStep);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      const newStep = activeStep - 1;
      setActiveStep(newStep);
      onStepChange?.(newStep);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
          onboardingCompleted: true,
          onboardingCompletedAt: new Date()
        });
      }
      onClose();
    } catch (error) {
      console.error("Onboarding kaydetme hatası:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
          onboardingCompleted: true,
          onboardingCompletedAt: new Date()
        });
      }
      onClose();
    } catch (error) {
      console.error("Onboarding kaydetme hatası:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentStepData = steps[activeStep];

  return (
    <Dialog
      open={open}
      onClose={handleSkip}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          overflow: 'hidden'
        }
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        {/* Header */}
        <Box sx={{ 
          p: 3, 
          pb: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 4px 24px 0 rgba(102,126,234,0.15)',
          minHeight: 90
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ 
              p: 0,
              width: 56,
              height: 56,
              borderRadius: '50%', 
              bgcolor: 'rgba(255,255,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px 0 rgba(102,126,234,0.15)',
              fontSize: 32
            }}>
              <span style={{ fontSize: 32 }}>{currentStepData.icon}</span>
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>
                {activeStep + 1}. {currentStepData.title}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85, color: '#fff', fontWeight: 500 }}>
                {currentStepData.description}
              </Typography>
            </Box>
          </Box>
          <IconButton 
            onClick={handleSkip}
            sx={{ 
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <Close />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ p: { xs: 1, sm: 3 }, minHeight: isMobile ? '60vh' : '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Box sx={{
                bgcolor: 'rgba(255,255,255,0.97)',
                borderRadius: 4,
                boxShadow: '0 6px 32px 0 rgba(102,126,234,0.13)',
                p: { xs: 2, sm: 4 },
                maxWidth: 520,
                mx: 'auto',
                minHeight: 220,
                color: '#333',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {currentStepData.content}
              </Box>
            </motion.div>
          </AnimatePresence>
        </Box>

        {/* Stepper */}
        <Box sx={{ px: 3, pb: 2 }}>
          {isMobile ? (
            // Mobil için kompakt stepper
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
              {steps.map((step, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: index <= activeStep ? 'white' : 'rgba(255,255,255,0.3)',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </Box>
          ) : (
            // Desktop için tam stepper
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((step, index) => (
                <Step key={index}>
                  <StepLabel 
                    sx={{ 
                      '& .MuiStepLabel-label': { 
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '0.75rem'
                      },
                      '& .MuiStepLabel-label.Mui-active': { 
                        color: 'white',
                        fontWeight: 600
                      },
                      '& .MuiStepLabel-label.Mui-completed': { 
                        color: 'rgba(255,255,255,0.9)'
                      }
                    }}
                  >
                    {step.title}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          )}
        </Box>
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ 
        p: 3, 
        pt: 2, 
        gap: 2,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 -2px 16px 0 rgba(102,126,234,0.10)'
      }}>
        <Button
          onClick={handleSkip}
          startIcon={<SkipNext />}
          sx={{
            color: 'rgba(255,255,255,0.9)',
            fontWeight: 700,
            fontSize: 18,
            px: 3,
            py: 1.5,
            borderRadius: 3,
            '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' }
          }}
          disabled={isLoading}
        >
          Atla
        </Button>
        <Box sx={{ flex: 1 }} />
        {activeStep > 0 && (
          <Button
            onClick={handleBack}
            startIcon={<ArrowBack />}
            variant="outlined"
            sx={{
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.5)',
              fontWeight: 700,
              fontSize: 18,
              px: 3,
              py: 1.5,
              borderRadius: 3,
              '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.10)' }
            }}
            disabled={isLoading}
          >
            Geri
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            endIcon={<ArrowForward />}
            variant="contained"
            sx={{
              bgcolor: 'rgba(255,255,255,0.18)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 18,
              px: 4,
              py: 1.5,
              borderRadius: 3,
              boxShadow: '0 2px 8px 0 rgba(102,126,234,0.10)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' }
            }}
            disabled={isLoading}
          >
            Sonraki
          </Button>
        ) : (
          <Button
            onClick={handleComplete}
            variant="contained"
            sx={{
              bgcolor: 'rgba(255,255,255,0.18)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 18,
              px: 4,
              py: 1.5,
              borderRadius: 3,
              boxShadow: '0 2px 8px 0 rgba(102,126,234,0.10)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' }
            }}
            disabled={isLoading}
          >
            Turu Tamamla
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default OnboardingTour; 