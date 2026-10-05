import type { Metadata } from 'next';
import './globals.css';
import './showroom.css';
import './experience.css';
export const metadata: Metadata = {
 title: 'MEMENTO KnifeShowroom',
 description: 'Five knives in a dark, immersive showroom. Explore the blade, personalise the handle and inspect every detail in 3D.',
 icons: { icon: '/favicon.svg' },
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>;}
