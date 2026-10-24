import { createContext } from 'react'
import UserSettingsManager from 'src/plugin/settings/UserSettingsManager'

export const SettingsManagerContext = createContext<UserSettingsManager | undefined>(undefined)
