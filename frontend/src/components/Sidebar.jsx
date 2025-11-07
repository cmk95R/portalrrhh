import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import { Link } from 'react-router-dom';

const drawerWidth = 240;

const Sidebar = () => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      <Toolbar />
      <List>
        <ListItem button component={Link} to="/">
          <ListItemText primary="Inicio" />
        </ListItem>
        <ListItem button component={Link} to="/register">
          <ListItemText primary="Cargar CV" />
        </ListItem>
        <ListItem button component={Link} to="/login">
          <ListItemText primary="Login" />
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar;
