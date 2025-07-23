import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Chip,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Button,
  Tooltip,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  TrendingUp as TrendingUpIcon,
  LocalDrink as LocalDrinkIcon,
  EmojiFoodBeverage as EmojiFoodBeverageIcon,
  WineBar as WineBarIcon,
  SportsBar as SportsBarIcon,
  LocalBar as LocalBarIcon,
  LocalCafe as LocalCafeIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Drink type icons mapping
const DRINK_ICONS = {
  water: <LocalDrinkIcon sx={{ color: '#21CBF3' }} />,
  herbalTea: <EmojiFoodBeverageIcon sx={{ color: '#8BC34A' }} />,
  blackTea: <EmojiFoodBeverageIcon sx={{ color: '#795548' }} />,
  greenTea: <EmojiFoodBeverageIcon sx={{ color: '#388E3C' }} />,
  mineralWater: <SportsBarIcon sx={{ color: '#00BCD4' }} />,
  ayran: <SportsBarIcon sx={{ color: '#FFEB3B' }} />,
  milk: <LocalBarIcon sx={{ color: '#FFFDE7' }} />,
  juice: <WineBarIcon sx={{ color: '#FF9800' }} />,
  vegetableJuice: <WineBarIcon sx={{ color: '#4CAF50' }} />,
  compote: <WineBarIcon sx={{ color: '#BCAAA4' }} />,
  filterCoffee: <LocalCafeIcon sx={{ color: '#6D4C41' }} />,
  turkishCoffee: <LocalCafeIcon sx={{ color: '#8D6E63' }} />,
  espresso: <LocalCafeIcon sx={{ color: '#3E2723' }} />,
  americano: <LocalCafeIcon sx={{ color: '#4E342E' }} />,
  milkCoffee: <LocalCafeIcon sx={{ color: '#BCAAA4' }} />,
};

// Drink type labels
const DRINK_LABELS = {
  water: 'Su',
  herbalTea: 'Bitki Çayı',
  blackTea: 'Siyah Çay',
  greenTea: 'Yeşil Çay',
  mineralWater: 'Maden Suyu',
  ayran: 'Ayran',
  milk: 'Süt',
  juice: 'Meyve Suyu',
  vegetableJuice: 'Sebze Suyu',
  compote: 'Komposto',
  filterCoffee: 'Filtre Kahve',
  turkishCoffee: 'Türk Kahvesi',
  espresso: 'Espresso',
  americano: 'Americano',
  milkCoffee: 'Sütlü Kahve',
};

const StyledCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, rgba(33,150,243,0.1) 0%, rgba(33,203,243,0.1) 100%)',
  borderRadius: 16,
  border: '1px solid rgba(33,150,243,0.2)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 32px rgba(33,150,243,0.15)',
    borderColor: 'rgba(33,150,243,0.4)',
  },
}));

const DrinkHistoryDialog = ({ open, onClose, drinkHistory = [] }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Filter states
  const [dateFilter, setDateFilter] = useState('all');
  const [drinkTypeFilter, setDrinkTypeFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Get unique drink types from history
  const uniqueDrinkTypes = useMemo(() => {
    const types = [...new Set(drinkHistory.map(item => item.type))];
    return types.sort();
  }, [drinkHistory]);

  // Filter history based on current filters
  const filteredHistory = useMemo(() => {
    let filtered = [...drinkHistory];

    // Date filter
    if (dateFilter !== 'all') {
      const today = new Date();
      const todayStr = today.toLocaleDateString('en-CA');
      
      if (dateFilter === 'today') {
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.date).toLocaleDateString('en-CA');
          return itemDate === todayStr;
        });
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('en-CA');
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.date).toLocaleDateString('en-CA');
          return itemDate === yesterdayStr;
        });
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(item => new Date(item.date) >= weekAgo);
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter(item => new Date(item.date) >= monthAgo);
      }
    }

    // Drink type filter
    if (drinkTypeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === drinkTypeFilter);
    }

    // Amount filter
    if (amountFilter !== 'all') {
      if (amountFilter === 'small') {
        filtered = filtered.filter(item => item.amount <= 200);
      } else if (amountFilter === 'medium') {
        filtered = filtered.filter(item => item.amount > 200 && item.amount <= 400);
      } else if (amountFilter === 'large') {
        filtered = filtered.filter(item => item.amount > 400);
      }
    }

    // Search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        DRINK_LABELS[item.type]?.toLowerCase().includes(term) ||
        item.amount.toString().includes(term) ||
        new Date(item.date).toLocaleDateString('tr-TR').includes(term)
      );
    }

    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [drinkHistory, dateFilter, drinkTypeFilter, amountFilter, searchTerm]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalDrinks = filteredHistory.length;
    const totalAmount = filteredHistory.reduce((sum, item) => sum + Math.abs(item.amount), 0);
    const totalWaterContribution = filteredHistory.reduce((sum, item) => sum + (item.addedWater || 0), 0);
    const averageAmount = totalDrinks > 0 ? Math.round(totalAmount / totalDrinks) : 0;
    
    const drinkTypeCounts = {};
    filteredHistory.forEach(item => {
      drinkTypeCounts[item.type] = (drinkTypeCounts[item.type] || 0) + 1;
    });

    return {
      totalDrinks,
      totalAmount,
      totalWaterContribution,
      averageAmount,
      drinkTypeCounts,
    };
  }, [filteredHistory]);

  const clearFilters = () => {
    setDateFilter('all');
    setDrinkTypeFilter('all');
    setAmountFilter('all');
    setSearchTerm('');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Bugün';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Dün';
    } else {
      return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: isMobile ? 0 : 3,
          maxHeight: isMobile ? '100vh' : '90vh',
        }
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pr: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            İçecek Geçmişi
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Statistics Cards */}
        <Grid container spacing={2} sx={{ mb: 3, mt: 4 }}>
          <Grid item xs={6} sm={3}>
            <StyledCard>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" sx={{ color: '#2196F3', fontWeight: 700 }}>
                  {stats.totalDrinks}
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Toplam İçecek
                </Typography>
              </CardContent>
            </StyledCard>
          </Grid>
                     <Grid item xs={6} sm={3}>
             <StyledCard>
               <CardContent sx={{ textAlign: 'center', py: 2 }}>
                 <Typography variant="h4" sx={{ color: '#4CAF50', fontWeight: 700 }}>
                   {stats.totalAmount}ml
                 </Typography>
                 <Typography variant="body2" sx={{ color: '#666' }}>
                   Toplam İşlem Miktarı
                 </Typography>
               </CardContent>
             </StyledCard>
           </Grid>
                     <Grid item xs={6} sm={3}>
             <StyledCard>
               <CardContent sx={{ textAlign: 'center', py: 2 }}>
                 <Typography variant="h4" sx={{ color: '#21CBF3', fontWeight: 700 }}>
                   {stats.totalWaterContribution}ml
                 </Typography>
                 <Typography variant="body2" sx={{ color: '#666' }}>
                   Net Su Katkısı
                 </Typography>
               </CardContent>
             </StyledCard>
           </Grid>
          <Grid item xs={6} sm={3}>
            <StyledCard>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" sx={{ color: '#FF9800', fontWeight: 700 }}>
                  {stats.averageAmount}ml
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Ortalama
                </Typography>
              </CardContent>
            </StyledCard>
          </Grid>
        </Grid>

        {/* Filters */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterIcon sx={{ color: '#2196F3' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#333' }}>
              Filtreler
            </Typography>
            <Tooltip title="Filtreleri Temizle">
              <IconButton onClick={clearFilters} size="small" sx={{ ml: 'auto' }}>
                <ClearIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="Tarih"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                variant="outlined"
                size="small"
              >
                <MenuItem value="all">Tüm Tarihler</MenuItem>
                <MenuItem value="today">Bugün</MenuItem>
                <MenuItem value="yesterday">Dün</MenuItem>
                <MenuItem value="week">Son 7 Gün</MenuItem>
                <MenuItem value="month">Son 30 Gün</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="İçecek Tipi"
                value={drinkTypeFilter}
                onChange={(e) => setDrinkTypeFilter(e.target.value)}
                variant="outlined"
                size="small"
              >
                <MenuItem value="all">Tüm İçecekler</MenuItem>
                {uniqueDrinkTypes.map(type => (
                  <MenuItem key={type} value={type}>
                    {DRINK_LABELS[type] || type}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="Miktar"
                value={amountFilter}
                onChange={(e) => setAmountFilter(e.target.value)}
                variant="outlined"
                size="small"
              >
                <MenuItem value="all">Tüm Miktarlar</MenuItem>
                <MenuItem value="small">Küçük (≤200ml)</MenuItem>
                <MenuItem value="medium">Orta (201-400ml)</MenuItem>
                <MenuItem value="large">Büyük (&gt;400ml)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Ara"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                variant="outlined"
                size="small"
                placeholder="İçecek, miktar veya tarih..."
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* History List */}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#333', mb: 2 }}>
            İçecek Geçmişi ({filteredHistory.length} kayıt)
          </Typography>
          
          {filteredHistory.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <LocalDrinkIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#999', mb: 1 }}>
                İçecek geçmişi bulunamadı
              </Typography>
              <Typography variant="body2" sx={{ color: '#999' }}>
                Seçilen filtrelere uygun içecek kaydı yok.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
              {filteredHistory.map((item, index) => (
                <StyledCard key={index} sx={{ mb: 2 }}>
                  <CardContent sx={{ py: 2 }}>
                                         <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                         <Box sx={{ 
                           color: item.action === 'removed' ? '#f44336' : 'inherit',
                           opacity: item.action === 'removed' ? 0.7 : 1
                         }}>
                           {DRINK_ICONS[item.type] || <LocalDrinkIcon />}
                         </Box>
                         <Box>
                           <Typography 
                             variant="subtitle1" 
                             sx={{ 
                               fontWeight: 600, 
                               color: item.action === 'removed' ? '#f44336' : '#333',
                               textDecoration: item.action === 'removed' ? 'line-through' : 'none'
                             }}
                           >
                             {item.action === 'removed' ? 'Su Eksiltildi' : (DRINK_LABELS[item.type] || item.type)}
                           </Typography>
                           <Typography variant="body2" sx={{ color: '#666' }}>
                             {formatDate(item.date)} - {formatTime(item.date)}
                           </Typography>
                         </Box>
                       </Box>
                                             <Box sx={{ textAlign: 'right' }}>
                         <Typography 
                           variant="h6" 
                           sx={{ 
                             fontWeight: 700, 
                             color: item.action === 'removed' ? '#f44336' : '#2196F3' 
                           }}
                         >
                           {item.action === 'removed' ? '-' : '+'}{Math.abs(item.amount)}ml
                         </Typography>
                         <Chip
                           label={`Su katkısı: ${item.addedWater || 0}ml`}
                           size="small"
                           sx={{
                             background: item.action === 'removed' 
                               ? 'linear-gradient(135deg, #f44336 0%, #ef5350 100%)'
                               : 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
                             color: '#fff',
                             fontWeight: 600,
                           }}
                         />
                       </Box>
                    </Box>
                  </CardContent>
                </StyledCard>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default DrinkHistoryDialog; 