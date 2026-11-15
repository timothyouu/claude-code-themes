export type Appearance = 'auto' | 'light' | 'dark'
export type ScenarioKey = 'coffee' | 'heart' | 'headphones' | 'skateboard' | 'wand' | 'lightbulb' | 'magnifier' | 'dizzy' | 'book' | 'bubble' | 'cape' | 'kite'
export type Preferences = { scene: ScenarioKey; appearance: Appearance; enabled: boolean; motion: boolean }
