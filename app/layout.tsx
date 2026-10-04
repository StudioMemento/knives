import type { Metadata } from 'next';
import './globals.css';
import './showroom.css';
export const metadata: Metadata = {
 title: 'MEMENTO KnifeShowroom',
 description: 'Four knives. Explore the original 3D collection, create your finish and personal design, and try the complete demo checkout.',
 icons: { icon: '/favicon.svg' },
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>;}
