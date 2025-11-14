export default function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-gray-800">
      <div className="container mx-auto text-center text-gray-400">
        <p className="mb-4">&copy; 2025 Navlens. All rights reserved.</p>
        <div className="flex justify-center gap-6">
          <a href="#" className="hover:text-navlens-accent transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-navlens-accent transition-colors">
            Terms
          </a>
          <a href="#" className="hover:text-navlens-accent transition-colors">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
