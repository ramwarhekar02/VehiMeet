import { NavLink } from 'react-router-dom'

export const NavPill = ({ to, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `nav-pill shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
        isActive ? 'nav-pill-active' : 'nav-pill-idle'
      }`
    }
  >
    {label}
  </NavLink>
)
