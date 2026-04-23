import Navbar from "./navbar";
import HeroSection from "./hero-section";
import FeaturedFields from "./featured-fields";
import FeaturesSection from "./features-section";
import Testimonials from "./testimonials";
import AppDownload from "./app-download";
import Footer from "./footer";

function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <div className="pt-20">
        {" "}
        {/* Padding to account for the search box that overlaps */}
        <FeaturedFields />
        <FeaturesSection />
        <Testimonials />
        <AppDownload />
      </div>
      <Footer />
    </div>
  );
}

export default Home;
