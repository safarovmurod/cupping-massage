import { Navigate, Route, Routes } from 'react-router-dom'
import { useLang } from './contexts/LanguageContext.tsx'
import Header from './components/layout/Header.tsx'
import Footer from './components/layout/Footer.tsx'
import PageMetadata from './components/common/PageMetadata.tsx'
import ScrollToHash from './components/common/ScrollToHash.tsx'
import Home from './pages/Home.tsx'
import NotFound from './pages/NotFound.tsx'

export default function App() {
  const { lang } = useLang()
  return <>
    <PageMetadata />
    <ScrollToHash />
    <a href="#main-content" className="skip-link">{lang === 'tj' ? 'Ба маълумоти асосӣ' : lang === 'en' ? 'Skip to content' : 'Перейти к содержимому'}</a>
    <Header />
    <main id="main-content" tabIndex={-1}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Navigate to="/#contact" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
    <Footer />
  </>
}
