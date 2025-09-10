import PreSaveCard from "./components/PreSaveCard";

export default function App() {
  return (
    <PreSaveCard
      artwork="/artwork.jpg" // swap to /src/assets/artwork.jpg if you import it
      title="The Love Song"
      artist="Anastasia"
      links={[
        { brand: "Spotify", href: "https://open.spotify.com" },
        { brand: "Apple Music", href: "https://music.apple.com" },
        { brand: "YouTube", href: "https://youtube.com" },
        { brand: "pandora", href: "https://pandora.com" },
        { brand: "deezer", href: "https://deezer.com" },
      ]}
      // Optional background image behind the card:
      background="https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2000&auto=format&fit=crop"
    />
  );
}