import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const sans = Inter({
	subsets: ["latin"],
	variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
	subsets: ["latin"],
	weight: ["400", "500"],
	variable: "--font-mono",
});

export const metadata: Metadata = {
	title: "Product Model Studio",
	description: "Local visual editor and viewer for .product.mdx files",
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={cn(sans.variable, mono.variable, "font-[var(--font-sans)]")}>
				<ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
					{children}
				</ThemeProvider>
			</body>
		</html>
	);
}
