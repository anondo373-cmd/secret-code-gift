import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  Upload,
  Trash2,
  Plus,
  Save,
  LogOut,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  Music,
  Image as ImageIcon,
  Heart,
  FileText,
  Lock,
  Eye,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Link as LinkIcon,
} from 'lucide-react';
import { AppConfig, AlbumPhoto, config as defaultConfig } from '../config';
import { useAppConfig } from '../context/ConfigContext';
import {
  getAdminHeaders,
  setStoredAdminToken,
  uploadToCloudinarySigned,
} from '../utils/cloudinary';
import {
  extractYouTubeId,
  fetchYouTubeMetadata,
  getYouTubeThumbnailUrl,
} from '../utils/youtube';
import { OptimizedImage } from './OptimizedImage';
import { HeartPhotoFrame } from './Illustrations';

export type PreviewTargetScreen =
  | 'lock'
  | 'hub'
  | 'gift1'
  | 'gift2'
  | 'gift3'
  | 'gift4';

interface AdminPanelProps {
  onClose: () => void;
  onPreviewScreen?: (screen: PreviewTargetScreen) => void;
}

type AdminTab =
  | 'lock'
  | 'tulips'
  | 'playlist'
  | 'letter'
  | 'album'
  | 'stickers'
  | 'setup';

const REQUIRED_ENV_NAMES = [
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'ADMIN_PASSWORD',
] as const;

interface HealthResponse {
  TURSO_DATABASE_URL: boolean;
  TURSO_AUTH_TOKEN: boolean;
  CLOUDINARY_CLOUD_NAME: boolean;
  CLOUDINARY_API_KEY: boolean;
  CLOUDINARY_API_SECRET: boolean;
  ADMIN_PASSWORD: boolean;
  dbConnected: boolean;
}

export function AdminPanel({ onClose, onPreviewScreen }: AdminPanelProps) {
  const { appConfig, setAppConfig, refreshConfig } = useAppConfig();
  const [draft, setDraft] = useState<AppConfig>(appConfig);
  const [activeTab, setActiveTab] = useState<AdminTab>('lock');

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordConfigured, setPasswordConfigured] = useState<boolean>(true);
  const [checkingSession, setCheckingSession] = useState<boolean>(true);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState<boolean>(false);

  // Health / Setup Status state
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(false);

  // Test Cloudinary state
  const [testingCloudinary, setTestingCloudinary] = useState<boolean>(false);
  const [cloudinaryTestResult, setCloudinaryTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Upload progress tracking by field key
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  // Replaced assets queued for server-side Cloudinary deletion on save
  const [assetsToDelete, setAssetsToDelete] = useState<
    Array<{ publicId: string; resourceType: 'image' | 'video' }>
  >([]);

  // Save state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    setDraft(appConfig);
  }, [appConfig]);

  const hasUnsavedChanges = JSON.stringify(draft) !== JSON.stringify(appConfig);

  const fetchHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const resp = await fetch('/api/health');
      if (resp.ok) {
        const data = (await resp.json()) as HealthResponse;
        setHealth(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    (async () => {
      try {
        const resp = await fetch('/api/admin/session', {
          credentials: 'include',
          headers: getAdminHeaders(),
        });
        if (resp.ok) {
          const data = await resp.json();
          setIsAuthenticated(Boolean(data.authenticated));
          setPasswordConfigured(Boolean(data.passwordConfigured));
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setCheckingSession(false);
      }
    })();
  }, [fetchHealth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    try {
      const resp = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setLoginError(data.error || 'Login failed.');
      } else {
        if (data.token) {
          setStoredAdminToken(data.token);
        }
        setIsAuthenticated(true);
        setPasswordInput('');
      }
    } catch {
      setLoginError('Network error while logging in.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
        headers: getAdminHeaders(),
      });
    } catch {
      // ignore
    }
    setStoredAdminToken(null);
    setIsAuthenticated(false);
  };

  /**
   * "Test Cloudinary" does a signed upload of a 1px image, then deletes it,
   * and shows Cloudinary's exact error message if it fails.
   */
  const handleTestCloudinary = async () => {
    setTestingCloudinary(true);
    setCloudinaryTestResult(null);

    try {
      const base64OnePx =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const byteChars = atob(base64OnePx);
      const byteNumbers = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const onePxBlob = new Blob([byteNumbers], { type: 'image/png' });

      const uploaded = await uploadToCloudinarySigned(onePxBlob, 'image');

      const destroyResp = await fetch('/api/admin/cloudinary-destroy', {
        method: 'POST',
        credentials: 'include',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          publicId: uploaded.public_id,
          resourceType: 'image',
        }),
      });
      const destroyData = await destroyResp.json().catch(() => ({}));

      if (!destroyResp.ok) {
        setCloudinaryTestResult({
          ok: false,
          message:
            destroyData.error ||
            `Uploaded ${uploaded.public_id} but destroy failed (HTTP ${destroyResp.status})`,
        });
        return;
      }

      setCloudinaryTestResult({
        ok: true,
        message: `Signed 1px image uploaded (${uploaded.public_id}) and deleted from Cloudinary.`,
      });
    } catch (browserErr) {
      try {
        const resp = await fetch('/api/admin/test-cloudinary', {
          method: 'POST',
          credentials: 'include',
          headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        });
        const data = await resp.json().catch(() => ({}));
        setCloudinaryTestResult({
          ok: Boolean(resp.ok && data.ok),
          message:
            data.error ||
            data.message ||
            (browserErr instanceof Error ? browserErr.message : 'Test failed'),
        });
      } catch {
        setCloudinaryTestResult({
          ok: false,
          message:
            browserErr instanceof Error
              ? browserErr.message
              : 'Test Cloudinary failed.',
        });
      }
    } finally {
      setTestingCloudinary(false);
    }
  };

  const queueOldAssetForCleanup = (
    oldPublicId: string | undefined,
    resourceType: 'image' | 'video'
  ) => {
    if (!oldPublicId) return;
    setAssetsToDelete((prev) => [...prev, { publicId: oldPublicId, resourceType }]);
  };

  const handleFileUpload = async (
    fieldKey: string,
    file: File,
    resourceType: 'image' | 'video',
    onUploaded: (secureUrl: string, publicId: string) => void
  ) => {
    setUploadErrors((prev) => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
    setUploadProgress((prev) => ({ ...prev, [fieldKey]: 1 }));

    try {
      const result = await uploadToCloudinarySigned(file, resourceType, (pct) => {
        setUploadProgress((prev) => ({ ...prev, [fieldKey]: Math.max(1, pct) }));
      });
      onUploaded(result.secure_url, result.public_id);
    } catch (err) {
      setUploadErrors((prev) => ({
        ...prev,
        [fieldKey]: err instanceof Error ? err.message : 'Upload failed',
      }));
    } finally {
      setTimeout(() => {
        setUploadProgress((prev) => {
          const next = { ...prev };
          delete next[fieldKey];
          return next;
        });
      }, 600);
    }
  };

  const persistDraftToServer = useCallback(
    async (cfgToSave: AppConfig, showToast = false) => {
      if (showToast) {
        setIsSaving(true);
        setSaveFeedback(null);
      }
      try {
        const resp = await fetch('/api/admin/config', {
          method: 'POST',
          credentials: 'include',
          headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            config: cfgToSave,
            assetsToDelete,
          }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || !data.ok) {
          if (showToast) {
            setSaveFeedback({
              type: 'error',
              text: data.error || 'Failed to save configuration.',
            });
          }
        } else {
          setAppConfig(cfgToSave);
          setAssetsToDelete([]);
          if (showToast) {
            await refreshConfig();
            setSaveFeedback({
              type: 'success',
              text: 'All changes saved & synced for deployment!',
            });
            setTimeout(() => setSaveFeedback(null), 4000);
          }
        }
      } catch (err) {
        if (showToast) {
          setSaveFeedback({
            type: 'error',
            text: err instanceof Error ? err.message : 'Network error while saving.',
          });
        }
      } finally {
        if (showToast) {
          setIsSaving(false);
        }
      }
    },
    [assetsToDelete, refreshConfig, setAppConfig]
  );

  // Auto-save draft changes to server (src/savedConfig.json + DB) after 800ms
  useEffect(() => {
    if (!isAuthenticated) return;
    if (JSON.stringify(draft) === JSON.stringify(appConfig)) return;
    const timer = setTimeout(() => {
      persistDraftToServer(draft, false);
    }, 800);
    return () => clearTimeout(timer);
  }, [appConfig, draft, isAuthenticated, persistDraftToServer]);

  const handleSaveConfig = async () => {
    await persistDraftToServer(draft, true);
  };

  const handlePreviewWithDraft = async (target: PreviewTargetScreen) => {
    setAppConfig(draft);
    await persistDraftToServer(draft, false);
    onPreviewScreen?.(target);
  };

  const moveAlbumPhoto = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= draft.albumPhotos.length) return;
    setDraft((d) => {
      const next = [...d.albumPhotos];
      const [moved] = next.splice(index, 1);
      next.splice(newIndex, 0, moved);
      return { ...d, albumPhotos: next };
    });
  };

  if (checkingSession) {
    return (
      <div className="min-h-dvh w-full bg-[#FDEBF1] flex items-center justify-center p-6">
        <div className="font-fredoka text-lg text-[#D6336C]">Loading Admin Studio...</div>
      </div>
    );
  }

  // Unauthenticated Login View
  if (!isAuthenticated) {
    return (
      <div className="min-h-dvh w-full bg-watercolor-clouds flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-[#FFF3DC] rounded-3xl border-2 border-[#F8C8D8] shadow-[0_12px_32px_rgba(214,51,108,0.16)] p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#D6336C] text-[#FFF3DC] flex items-center justify-center shadow-xs">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-fredoka text-2xl font-bold text-[#D6336C] leading-none">
                  Gift Admin Panel
                </h1>
                <p className="font-fredoka text-xs text-[#5A2A2A]/70 mt-0.5">
                  Control photos, music, letter & secret code
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-[#FDEBF1] text-[#5A2A2A] font-fredoka text-xs font-semibold hover:bg-[#F8C8D8]/60 transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Website
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password-input"
                className="block font-fredoka text-sm font-semibold text-[#5A2A2A] mb-1.5"
              >
                Admin Password
              </label>
              <input
                id="admin-password-input"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder={
                  passwordConfigured
                    ? 'Enter your ADMIN_PASSWORD'
                    : 'Enter 0214 (or set ADMIN_PASSWORD in Secrets)'
                }
                required
                className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[#F8C8D8] text-[#5A2A2A] font-fredoka focus:outline-none focus:border-[#D6336C]"
              />
              {!passwordConfigured && (
                <p className="mt-1.5 font-fredoka text-xs text-[#D6336C]/85">
                  Tip: ADMIN_PASSWORD is not set in Secrets yet. Use default password <strong>0214</strong> to enter now.
                </p>
              )}
            </div>

            {loginError && (
              <p className="text-xs font-fredoka font-medium text-[#D6336C] bg-[#FDEBF1] p-3 rounded-xl border border-[#D6336C]/30">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full min-h-[46px] rounded-xl bg-[#D6336C] text-[#FFF3DC] font-fredoka font-semibold text-base shadow-[0_3px_0_#5A2A2A] hover:brightness-105 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-60"
            >
              {loggingIn ? 'Signing in...' : 'Open Admin Studio →'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh w-full bg-[#FDEBF1] text-[#5A2A2A] flex flex-col">
      {/* Top Sticky Studio Header */}
      <header className="sticky top-0 z-30 bg-[#FFF3DC]/95 backdrop-blur-md border-b-2 border-[#F8C8D8] px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#FDEBF1] border border-[#F8C8D8] font-fredoka text-sm font-semibold text-[#5A2A2A] hover:bg-[#F8C8D8]/60 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            View Website
          </button>
          <span className="font-fredoka text-lg sm:text-xl font-bold text-[#D6336C] whitespace-nowrap">
            💗 Secret Gift Admin Studio
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {hasUnsavedChanges && (
            <span className="hidden md:inline-block font-fredoka text-xs font-semibold text-[#D6336C] bg-[#FDEBF1] px-3 py-1 rounded-full border border-[#F8C8D8]">
              Unsaved changes
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[#D6336C] text-[#FFF3DC] font-fredoka text-sm font-semibold shadow-[0_3px_0_#5A2A2A] hover:brightness-105 active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-[#F8C8D8] text-[#5A2A2A] hover:bg-[#FDEBF1] transition-colors cursor-pointer flex items-center gap-1 font-fredoka text-xs font-semibold whitespace-nowrap shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Save Status Toast Banner */}
      {saveFeedback && (
        <div
          className={`px-4 py-2.5 text-center font-fredoka text-sm font-semibold ${
            saveFeedback.type === 'success'
              ? 'bg-emerald-100 text-emerald-900 border-b border-emerald-300'
              : 'bg-rose-100 text-rose-900 border-b border-rose-300'
          }`}
        >
          {saveFeedback.text}
        </div>
      )}

      {/* Quick Overview Stats Strip */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#FFF3DC] rounded-2xl p-3.5 border border-[#F8C8D8] flex items-center justify-between">
            <div>
              <span className="font-fredoka text-xs text-[#5A2A2A]/65 block">Secret Code</span>
              <span className="font-mono text-lg font-bold text-[#D6336C] tracking-widest">
                {draft.secretCode || '----'}
              </span>
            </div>
            <Lock className="w-5 h-5 text-[#D6336C]/60" />
          </div>

          <div className="bg-[#FFF3DC] rounded-2xl p-3.5 border border-[#F8C8D8] flex items-center justify-between">
            <div className="min-w-0">
              <span className="font-fredoka text-xs text-[#5A2A2A]/65 block">Playlist Song</span>
              <span className="font-fredoka text-sm font-bold text-[#5A2A2A] truncate block">
                {draft.songTitle}
              </span>
            </div>
            <Music className="w-5 h-5 text-[#D6336C]/60 shrink-0" />
          </div>

          <div className="bg-[#FFF3DC] rounded-2xl p-3.5 border border-[#F8C8D8] flex items-center justify-between">
            <div>
              <span className="font-fredoka text-xs text-[#5A2A2A]/65 block">Photo Album</span>
              <span className="font-fredoka text-sm font-bold text-[#5A2A2A]">
                {draft.albumPhotos.length} Polaroid Moments
              </span>
            </div>
            <ImageIcon className="w-5 h-5 text-[#D6336C]/60" />
          </div>

          <div className="bg-[#FFF3DC] rounded-2xl p-3.5 border border-[#F8C8D8] flex items-center justify-between">
            <div>
              <span className="font-fredoka text-xs text-[#5A2A2A]/65 block">Quick Preview</span>
              <button
                type="button"
                onClick={() => handlePreviewWithDraft('hub')}
                className="font-fredoka text-xs font-bold text-[#D6336C] hover:underline cursor-pointer flex items-center gap-1 mt-0.5"
              >
                <Eye className="w-3.5 h-3.5" /> Open Gift Hub ↗
              </button>
            </div>
            <Heart className="w-5 h-5 text-[#D6336C]/60" />
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Navigation Tabs */}
        <nav className="lg:col-span-3 flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
          {[
            { id: 'lock', label: '1. Lock & Heart Photos', icon: Lock },
            { id: 'tulips', label: '2. Gift 1: Tulips', icon: Heart },
            { id: 'playlist', label: '3. Gift 2: Playlist', icon: Music },
            { id: 'letter', label: '4. Gift 3: Letter', icon: FileText },
            { id: 'album', label: '5. Gift 4: Photo Album', icon: ImageIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`min-h-[44px] px-4 py-2.5 rounded-2xl font-fredoka text-sm font-semibold flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#D6336C] text-[#FFF3DC] shadow-[0_3px_0_#5A2A2A]'
                    : 'bg-[#FFF3DC] text-[#5A2A2A] border border-[#F8C8D8] hover:bg-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}

          {/* Reset to Default Placeholder Data Button */}
          <div className="hidden lg:block pt-4 mt-2 border-t border-[#F8C8D8]">
            <button
              type="button"
              onClick={() => setDraft(defaultConfig)}
              className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-white/70 hover:bg-white border border-[#F8C8D8] font-fredoka text-xs font-semibold text-[#5A2A2A]/75 hover:text-[#D6336C] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Default Demo Content
            </button>
          </div>
        </nav>

        {/* Right Tab Panel */}
        <div className="lg:col-span-9 bg-[#FFF3DC] rounded-3xl border-2 border-[#F8C8D8] p-5 sm:p-7 shadow-[0_8px_24px_rgba(214,51,108,0.08)]">
          {/* TAB 1: LOCK SCREEN & HEART PHOTOS */}
          {activeTab === 'lock' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-fredoka text-2xl font-bold text-[#D6336C]">
                    Screen 1: Secret Code & Heart Frames
                  </h2>
                  <p className="font-fredoka text-xs text-[#5A2A2A]/75">
                    Customize the 4-digit secret code and the two overlapping heart-framed photos on the Lock Screen.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePreviewWithDraft('lock')}
                  className="min-h-[38px] px-4 py-1.5 rounded-xl bg-white border border-[#F8C8D8] font-fredoka text-xs font-semibold text-[#D6336C] hover:bg-[#FDEBF1] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview Lock Screen ↗
                </button>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#F8C8D8] max-w-sm">
                <label className="block font-fredoka text-sm font-bold text-[#5A2A2A] mb-1">
                  4-Digit Secret Passcode
                </label>
                <p className="font-fredoka text-xs text-[#5A2A2A]/65 mb-2">
                  Visitors must enter these 4 digits on the heart keypad to unlock the gifts.
                </p>
                <input
                  type="text"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  value={draft.secretCode}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setDraft((d) => ({ ...d, secretCode: digitsOnly }));
                  }}
                  placeholder="0214"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFF3DC]/60 border-2 border-[#F8C8D8] font-mono text-2xl font-bold tracking-[0.35em] text-center text-[#D6336C] focus:outline-none focus:border-[#D6336C]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Heart Photo 1 */}
                <div className="bg-white p-4 rounded-2xl border border-[#F8C8D8] space-y-3">
                  <span className="font-fredoka text-sm font-bold text-[#5A2A2A] block">
                    Left Heart Frame Photo
                  </span>
                  <div className="w-44 h-44 mx-auto flex items-center justify-center">
                    <HeartPhotoFrame
                      photoUrl={draft.photo1Url}
                      alt="Heart Frame 1 Preview"
                      clipId="admin-heart-1"
                      className="w-44 h-44"
                    />
                  </div>
                  <label className="min-h-[42px] w-full px-4 py-2 rounded-xl bg-[#D6336C] text-[#FFF3DC] font-fredoka text-xs font-semibold flex items-center justify-center gap-2 hover:brightness-105 transition-all cursor-pointer shadow-xs">
                    <Upload className="w-4 h-4" />
                    {uploadProgress['photo1'] !== undefined
                      ? `Uploading (${uploadProgress['photo1']}%)...`
                      : 'Upload Photo 1 (Auto WebP <100 KB)'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        handleFileUpload('photo1', file, 'image', (url, pubId) => {
                          queueOldAssetForCleanup(draft.photo1PublicId, 'image');
                          setDraft((d) => ({
                            ...d,
                            photo1Url: url,
                            photo1PublicId: pubId,
                          }));
                        });
                      }}
                    />
                  </label>
                  <div className="flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-[#5A2A2A]/50 shrink-0" />
                    <input
                      type="text"
                      value={draft.photo1Url.startsWith('data:') ? '' : draft.photo1Url}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          photo1Url: e.target.value || defaultConfig.photo1Url,
                        }))
                      }
                      placeholder="Or paste direct image URL..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#FFF3DC]/40 border border-[#F8C8D8] font-mono text-xs text-[#5A2A2A]"
                    />
                  </div>
                  {uploadErrors['photo1'] && (
                    <p className="text-xs font-mono text-rose-600">{uploadErrors['photo1']}</p>
                  )}
                </div>

                {/* Heart Photo 2 */}
                <div className="bg-white p-4 rounded-2xl border border-[#F8C8D8] space-y-3">
                  <span className="font-fredoka text-sm font-bold text-[#5A2A2A] block">
                    Right Heart Frame Photo
                  </span>
                  <div className="w-44 h-44 mx-auto flex items-center justify-center">
                    <HeartPhotoFrame
                      photoUrl={draft.photo2Url}
                      alt="Heart Frame 2 Preview"
                      clipId="admin-heart-2"
                      className="w-44 h-44"
                    />
                  </div>
                  <label className="min-h-[42px] w-full px-4 py-2 rounded-xl bg-[#D6336C] text-[#FFF3DC] font-fredoka text-xs font-semibold flex items-center justify-center gap-2 hover:brightness-105 transition-all cursor-pointer shadow-xs">
                    <Upload className="w-4 h-4" />
                    {uploadProgress['photo2'] !== undefined
                      ? `Uploading (${uploadProgress['photo2']}%)...`
                      : 'Upload Photo 2 (Auto WebP <100 KB)'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        handleFileUpload('photo2', file, 'image', (url, pubId) => {
                          queueOldAssetForCleanup(draft.photo2PublicId, 'image');
                          setDraft((d) => ({
                            ...d,
                            photo2Url: url,
                            photo2PublicId: pubId,
                          }));
                        });
                      }}
                    />
                  </label>
                  <div className="flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-[#5A2A2A]/50 shrink-0" />
                    <input
                      type="text"
                      value={draft.photo2Url.startsWith('data:') ? '' : draft.photo2Url}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          photo2Url: e.target.value || defaultConfig.photo2Url,
                        }))
                      }
                      placeholder="Or paste direct image URL..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#FFF3DC]/40 border border-[#F8C8D8] font-mono text-xs text-[#5A2A2A]"
                    />
                  </div>
                  {uploadErrors['photo2'] && (
                    <p className="text-xs font-mono text-rose-600">{uploadErrors['photo2']}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GIFT 1 - TULIP NOTES */}
          {activeTab === 'tulips' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-fredoka text-2xl font-bold text-[#D6336C]">
                    Gift 1: Your Favorite Tulips (6 Notes)
                  </h2>
                  <p className="font-fredoka text-xs text-[#5A2A2A]/75">
                    Edit the 6 handwritten speech-bubble notes displayed around the tulip bouquet.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePreviewWithDraft('gift1')}
                  className="min-h-[38px] px-4 py-1.5 rounded-xl bg-white border border-[#F8C8D8] font-fredoka text-xs font-semibold text-[#D6336C] hover:bg-[#FDEBF1] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview Tulips Page ↗
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {draft.tulipNotes.map((note, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-4 rounded-3xl border-2 border-[#D6336C]/45 shadow-[0_4px_0_#F8C8D8]"
                  >
                    <label className="block font-fredoka text-xs font-bold text-[#D6336C] mb-1.5">
                      Speech Bubble #{idx + 1} ({idx < 3 ? 'Left Side' : 'Right Side'})
                    </label>
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => {
                        const updated = [...draft.tulipNotes] as [
                          string,
                          string,
                          string,
                          string,
                          string,
                          string,
                        ];
                        updated[idx] = e.target.value;
                        setDraft((d) => ({ ...d, tulipNotes: updated }));
                      }}
                      className="w-full px-3.5 py-2 rounded-2xl bg-[#FFF3DC] border border-[#F8C8D8] font-script text-xl font-semibold text-[#5A2A2A] focus:outline-none focus:border-[#D6336C]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: GIFT 2 - PLAYLIST */}
          {activeTab === 'playlist' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-fredoka text-2xl font-bold text-[#D6336C]">
                    Gift 2: A Playlist Made For You
                  </h2>
                  <p className="font-fredoka text-xs text-[#5A2A2A]/75">
                    Customize the song title, artist, album cover art, and audio track for the vinyl player.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePreviewWithDraft('gift2')}
                  className="min-h-[38px] px-4 py-1.5 rounded-xl bg-white border border-[#F8C8D8] font-fredoka text-xs font-semibold text-[#D6336C] hover:bg-[#FDEBF1] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview Playlist Page ↗
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-[#F8C8D8]">
                  <label className="block font-fredoka text-sm font-bold mb-1">
                    Song Title
                  </label>
                  <input
                    type="text"
                    value={draft.songTitle}
                    onChange={(e) => setDraft((d) => ({ ...d, songTitle: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FFF3DC]/50 border border-[#F8C8D8] font-fredoka text-sm focus:outline-none focus:border-[#D6336C]"
                  />
                </div>
                <div className="bg-white p-4 rounded-2xl border border-[#F8C8D8]">
                  <label className="block font-fredoka text-sm font-bold mb-1">
                    Artist Name
                  </label>
                  <input
                    type="text"
                    value={draft.artist}
                    onChange={(e) => setDraft((d) => ({ ...d, artist: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FFF3DC]/50 border border-[#F8C8D8] font-fredoka text-sm focus:outline-none focus:border-[#D6336C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Album Cover Art Upload */}
                <div className="bg-white p-4 rounded-2xl border border-[#F8C8D8] space-y-3">
                  <span className="font-fredoka text-sm font-bold block">
                    Square Album Cover Art
                  </span>
                  <div className="w-40 h-40 mx-auto rounded-2xl overflow-hidden bg-[#111111] p-2 shadow-md">
                    <div className="w-full h-full rounded-xl overflow-hidden">
                      <OptimizedImage src={draft.albumArtUrl} alt={draft.songTitle} />
                    </div>
                  </div>
                  <label className="min-h-[42px] w-full px-4 py-2 rounded-xl bg-[#D6336C] text-[#FFF3DC] font-fredoka text-xs font-semibold flex items-center justify-center gap-2 hover:brightness-105 transition-all cursor-pointer">
                    <Upload className="w-4 h-4" />
                    {uploadProgress['albumArt'] !== undefined
                      ? `Uploading (${uploadProgress['albumArt']}%)...`
                      : 'Upload Cover Art (<100 KB WebP)'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        handleFileUpload('albumArt', file, 'image', (url, pubId) => {
                          queueOldAssetForCleanup(draft.albumArtPublicId, 'image');
                          setDraft((d) => ({
                            ...d,
                            albumArtUrl: url,
                            albumArtPublicId: pubId,
                          }));
                        });
                      }}
                    />
                  </label>
                  <div className="flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-[#5A2A2A]/50 shrink-0" />
                    <input
                      type="text"
                      value={draft.albumArtUrl.startsWith('data:') ? '' : draft.albumArtUrl}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          albumArtUrl: e.target.value || defaultConfig.albumArtUrl,
                        }))
                      }
                      placeholder="Or paste album cover URL..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#FFF3DC]/40 border border-[#F8C8D8] font-mono text-xs text-[#5A2A2A]"
                    />
                  </div>
                  {uploadErrors['albumArt'] && (
                    <p className="text-xs font-mono text-rose-600">{uploadErrors['albumArt']}</p>
                  )}
                </div>

                {/* Audio File or YouTube Link */}
                <div className="bg-white p-4 rounded-2xl border border-[#F8C8D8] flex flex-col justify-between space-y-3">
                  {(() => {
                    const ytId = extractYouTubeId(draft.audioUrl);
                    return (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-fredoka text-sm font-bold block">
                              YouTube Song Link or Audio File
                            </span>
                            {ytId && (
                              <span className="font-fredoka text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                ✓ YouTube Linked
                              </span>
                            )}
                          </div>
                          <p className="font-fredoka text-xs text-[#5A2A2A]/70">
                            Paste any YouTube link (e.g. <code className="text-[#D6336C]">https://youtu.be/...</code>) below, or upload an MP3/WAV file.
                          </p>

                          {ytId ? (
                            <div className="space-y-2 pt-1">
                              <div className="w-full aspect-video rounded-xl overflow-hidden border border-[#F8C8D8] bg-black">
                                <iframe
                                  src={`https://www.youtube.com/embed/${ytId}`}
                                  title="YouTube Song Preview"
                                  className="w-full h-full border-0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  const meta = await fetchYouTubeMetadata(ytId);
                                  if (meta) {
                                    setDraft((d) => ({
                                      ...d,
                                      songTitle: meta.title || d.songTitle,
                                      artist: meta.author_name || d.artist,
                                      albumArtUrl:
                                        meta.thumbnail_url ||
                                        getYouTubeThumbnailUrl(ytId),
                                    }));
                                  } else {
                                    setDraft((d) => ({
                                      ...d,
                                      albumArtUrl: getYouTubeThumbnailUrl(ytId),
                                    }));
                                  }
                                }}
                                className="w-full py-1.5 px-3 rounded-xl bg-[#FFF3DC] hover:bg-[#FDEBF1] border border-[#F8C8D8] font-fredoka text-xs font-semibold text-[#D6336C] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Music className="w-3.5 h-3.5" />
                                Auto-fill Song Title, Artist & Cover from YouTube
                              </button>
                            </div>
                          ) : (
                            <audio controls src={draft.audioUrl} className="w-full mt-2" />
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 bg-[#FFF3DC]/60 p-2 rounded-xl border-2 border-[#D6336C]/40">
                            <LinkIcon className="w-4 h-4 text-[#D6336C] shrink-0" />
                            <input
                              type="text"
                              value={draft.audioUrl.startsWith('data:') ? '' : draft.audioUrl}
                              onChange={async (e) => {
                                const val = e.target.value;
                                setDraft((d) => ({
                                  ...d,
                                  audioUrl: val || defaultConfig.audioUrl,
                                }));
                                const detectedYtId = extractYouTubeId(val);
                                if (detectedYtId) {
                                  const meta = await fetchYouTubeMetadata(detectedYtId);
                                  if (meta) {
                                    setDraft((d) => ({
                                      ...d,
                                      songTitle:
                                        d.songTitle === defaultConfig.songTitle && meta.title
                                          ? meta.title
                                          : d.songTitle,
                                      artist:
                                        d.artist === defaultConfig.artist && meta.author_name
                                          ? meta.author_name
                                          : d.artist,
                                      albumArtUrl:
                                        d.albumArtUrl === defaultConfig.albumArtUrl &&
                                        meta.thumbnail_url
                                          ? meta.thumbnail_url
                                          : d.albumArtUrl,
                                    }));
                                  }
                                }
                              }}
                              placeholder="Paste YouTube link (https://youtu.be/...) or .mp3 URL"
                              className="w-full bg-transparent font-mono text-xs text-[#5A2A2A] focus:outline-none"
                            />
                          </div>

                          <label className="min-h-[40px] w-full px-4 py-2 rounded-xl bg-[#FDEBF1] border border-[#F8C8D8] font-fredoka text-xs font-semibold text-[#D6336C] flex items-center justify-center gap-2 hover:bg-[#F8C8D8]/50 transition-colors cursor-pointer">
                            <Upload className="w-4 h-4" />
                            {uploadProgress['audio'] !== undefined
                              ? `Uploading Audio (${uploadProgress['audio']}%)...`
                              : 'Or Upload MP3 / WAV File (Signed)'}
                            <input
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                handleFileUpload('audio', file, 'video', (url, pubId) => {
                                  queueOldAssetForCleanup(draft.audioPublicId, 'video');
                                  setDraft((d) => ({
                                    ...d,
                                    audioUrl: url,
                                    audioPublicId: pubId,
                                  }));
                                });
                              }}
                            />
                          </label>
                        </div>
                      </>
                    );
                  })()}
                  {uploadErrors['audio'] && (
                    <p className="text-xs font-mono text-rose-600">{uploadErrors['audio']}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GIFT 3 - LETTER */}
          {activeTab === 'letter' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-fredoka text-2xl font-bold text-[#D6336C]">
                    Gift 3: A Letter From My Heart
                  </h2>
                  <p className="font-fredoka text-xs text-[#5A2A2A]/75">
                    Write your heartfelt letter and sign-off. It will be revealed with a typewriter effect on lined notebook paper.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePreviewWithDraft('gift3')}
                  className="min-h-[38px] px-4 py-1.5 rounded-xl bg-white border border-[#F8C8D8] font-fredoka text-xs font-semibold text-[#D6336C] hover:bg-[#FDEBF1] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview Letter Page ↗
                </button>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#F8C8D8] space-y-4">
                <div>
                  <label className="block font-fredoka text-sm font-bold mb-1.5">
                    Letter Body (Handwritten Notebook Preview)
                  </label>
                  <textarea
                    rows={8}
                    value={draft.letterText}
                    onChange={(e) => setDraft((d) => ({ ...d, letterText: e.target.value }))}
                    className="w-full pl-12 pr-6 sm:pl-14 sm:pr-8 py-4 rounded-2xl bg-notebook-paper border border-[#F8C8D8] font-patrick text-xl text-[#5A2A2A] leading-[32px] focus:outline-none focus:border-[#D6336C]"
                  />
                </div>
                <div>
                  <label className="block font-fredoka text-sm font-bold mb-1">
                    Right-Aligned Sign-Off Signature
                  </label>
                  <input
                    type="text"
                    value={draft.signOffText}
                    onChange={(e) => setDraft((d) => ({ ...d, signOffText: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FFF3DC]/60 border border-[#F8C8D8] font-patrick text-xl font-bold text-right text-[#D6336C] focus:outline-none focus:border-[#D6336C]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: GIFT 4 - PHOTO ALBUM */}
          {activeTab === 'album' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-fredoka text-2xl font-bold text-[#D6336C]">
                    Gift 4: Polaroid Photo Album ({draft.albumPhotos.length})
                  </h2>
                  <p className="font-fredoka text-xs text-[#5A2A2A]/75">
                    Upload your favorite pictures together, edit captions & dates, or reorder polaroids.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePreviewWithDraft('gift4')}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white border border-[#F8C8D8] font-fredoka text-xs font-semibold text-[#D6336C] hover:bg-[#FDEBF1] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview Album ↗
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newMemory: AlbumPhoto = {
                        url: defaultConfig.photo1Url,
                        caption: 'A new sweet memory together',
                        date: `Moment 0${draft.albumPhotos.length + 1}`,
                      };
                      setDraft((d) => ({
                        ...d,
                        albumPhotos: [...d.albumPhotos, newMemory],
                      }));
                    }}
                    className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#D6336C] text-[#FFF3DC] font-fredoka text-xs font-semibold shadow-[0_3px_0_#5A2A2A] flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Photo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {draft.albumPhotos.map((item, idx) => {
                  const uploadKey = `album_${idx}`;
                  return (
                    <div
                      key={idx}
                      className="bg-white p-4 rounded-2xl border-2 border-[#F8C8D8] space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-fredoka text-xs font-bold text-[#D6336C]">
                          Polaroid #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveAlbumPhoto(idx, -1)}
                            title="Move earlier"
                            className="p-1.5 rounded-lg text-[#5A2A2A] hover:bg-[#FDEBF1] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === draft.albumPhotos.length - 1}
                            onClick={() => moveAlbumPhoto(idx, 1)}
                            title="Move later"
                            className="p-1.5 rounded-lg text-[#5A2A2A] hover:bg-[#FDEBF1] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          {draft.albumPhotos.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                queueOldAssetForCleanup(item.publicId, 'image');
                                setDraft((d) => ({
                                  ...d,
                                  albumPhotos: d.albumPhotos.filter((_, i) => i !== idx),
                                }));
                              }}
                              aria-label={`Delete polaroid ${idx + 1}`}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="w-full h-64 sm:h-72 rounded-xl overflow-hidden bg-[#FDEBF1] border border-[#F8C8D8]">
                        <OptimizedImage src={item.url} alt={item.caption} fit="contain" />
                      </div>

                      <label className="min-h-[38px] w-full px-3 py-1.5 rounded-xl bg-[#D6336C] text-[#FFF3DC] font-fredoka text-xs font-semibold flex items-center justify-center gap-1.5 hover:brightness-105 transition-all cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        {uploadProgress[uploadKey] !== undefined
                          ? `Uploading (${uploadProgress[uploadKey]}%)...`
                          : 'Upload Photo (<100 KB WebP)'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            handleFileUpload(uploadKey, file, 'image', (url, pubId) => {
                              queueOldAssetForCleanup(item.publicId, 'image');
                              setDraft((d) => {
                                const next = [...d.albumPhotos];
                                next[idx] = { ...next[idx], url, publicId: pubId };
                                return { ...d, albumPhotos: next };
                              });
                            });
                          }}
                        />
                      </label>

                      <div className="flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-[#5A2A2A]/50 shrink-0" />
                        <input
                          type="text"
                          value={item.url.startsWith('data:') ? '' : item.url}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((d) => {
                              const next = [...d.albumPhotos];
                              next[idx] = {
                                ...next[idx],
                                url: val || defaultConfig.photo1Url,
                              };
                              return { ...d, albumPhotos: next };
                            });
                          }}
                          placeholder="Or paste image URL..."
                          className="w-full px-2.5 py-1 rounded-lg bg-[#FFF3DC]/40 border border-[#F8C8D8] font-mono text-xs text-[#5A2A2A]"
                        />
                      </div>

                      {uploadErrors[uploadKey] && (
                        <p className="text-xs font-mono text-rose-600">
                          {uploadErrors[uploadKey]}
                        </p>
                      )}

                      <div>
                        <label className="block font-fredoka text-[11px] font-semibold text-[#5A2A2A]/70 mb-0.5">
                          Memory Caption
                        </label>
                        <input
                          type="text"
                          value={item.caption}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((d) => {
                              const next = [...d.albumPhotos];
                              next[idx] = { ...next[idx], caption: val };
                              return { ...d, albumPhotos: next };
                            });
                          }}
                          placeholder="Caption"
                          className="w-full px-3 py-1.5 rounded-lg bg-[#FFF3DC]/40 border border-[#F8C8D8] font-patrick text-base text-[#5A2A2A]"
                        />
                      </div>

                      <div>
                        <label className="block font-fredoka text-[11px] font-semibold text-[#5A2A2A]/70 mb-0.5">
                          Date / Chapter Label
                        </label>
                        <input
                          type="text"
                          value={item.date}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((d) => {
                              const next = [...d.albumPhotos];
                              next[idx] = { ...next[idx], date: val };
                              return { ...d, albumPhotos: next };
                            });
                          }}
                          placeholder="Date or label"
                          className="w-full px-3 py-1.5 rounded-lg bg-[#FFF3DC]/40 border border-[#F8C8D8] font-fredoka text-xs text-[#D6336C]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: CUSTOM STICKER ILLUSTRATIONS */}
          {activeTab === 'stickers' && (
            <div className="space-y-4">
              <div>
                <h2 className="font-fredoka text-2xl font-bold text-[#D6336C]">
                  Custom Sticker Illustrations
                </h2>
                <p className="font-fredoka text-xs text-[#5A2A2A]/75">
                  Replace any built-in SVG sticker with your own custom PNG/WebP illustration.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(
                  [
                    { key: 'bow', label: 'Pink Ribbon Bow' },
                    { key: 'giftBox', label: 'Gift Box' },
                    { key: 'tulipBouquet', label: 'Tulip Bouquet' },
                    { key: 'vinyl', label: 'Vinyl Record' },
                    { key: 'cat', label: 'Calico Cat' },
                    { key: 'blossoms', label: 'Cherry Blossoms' },
                    { key: 'laceBorder', label: 'Lace Corner Trim' },
                    { key: 'sparkles', label: 'Sparkle Star' },
                  ] as const
                ).map(({ key, label }) => {
                  const currentUrl = draft.illustrations[key];
                  const currentPubId = draft.illustrationsPublicIds?.[key];
                  const uploadKey = `sticker_${key}`;

                  return (
                    <div
                      key={key}
                      className="bg-white p-4 rounded-2xl border border-[#F8C8D8] flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-fredoka text-sm font-bold text-[#5A2A2A]">
                          {label}
                        </span>
                        {currentUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              queueOldAssetForCleanup(currentPubId, 'image');
                              setDraft((d) => ({
                                ...d,
                                illustrations: { ...d.illustrations, [key]: undefined },
                                illustrationsPublicIds: {
                                  ...(d.illustrationsPublicIds || {}),
                                  [key]: undefined,
                                },
                              }));
                            }}
                            className="text-xs font-fredoka text-rose-600 hover:underline cursor-pointer"
                          >
                            Reset to SVG
                          </button>
                        )}
                      </div>

                      <div className="text-xs font-mono text-[#5A2A2A]/60 truncate">
                        {currentUrl ? 'Custom image active' : 'Using default inline SVG'}
                      </div>

                      <label className="min-h-[38px] w-full px-3 py-1.5 rounded-xl bg-[#FDEBF1] border border-[#F8C8D8] font-fredoka text-xs font-semibold text-[#D6336C] flex items-center justify-center gap-1.5 hover:bg-[#F8C8D8]/50 transition-colors cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        {uploadProgress[uploadKey] !== undefined
                          ? `Uploading (${uploadProgress[uploadKey]}%)...`
                          : 'Upload Custom Artwork'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            handleFileUpload(uploadKey, file, 'image', (url, pubId) => {
                              queueOldAssetForCleanup(currentPubId, 'image');
                              setDraft((d) => ({
                                ...d,
                                illustrations: { ...d.illustrations, [key]: url },
                                illustrationsPublicIds: {
                                  ...(d.illustrationsPublicIds || {}),
                                  [key]: pubId,
                                },
                              }));
                            });
                          }}
                        />
                      </label>
                      {uploadErrors[uploadKey] && (
                        <p className="text-xs font-mono text-rose-600">
                          {uploadErrors[uploadKey]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 7: SETUP STATUS & TEST CLOUDINARY */}
          {activeTab === 'setup' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-fredoka text-2xl font-bold text-[#D6336C]">
                    Setup Status
                  </h2>
                  <p className="font-fredoka text-sm text-[#5A2A2A]/75">
                    Checks the 6 environment variable names and database connectivity without exposing secret values.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchHealth}
                  disabled={loadingHealth}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white border border-[#F8C8D8] font-fredoka text-xs font-semibold text-[#5A2A2A] hover:bg-[#FDEBF1] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* 6 Environment Variable Booleans */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {REQUIRED_ENV_NAMES.map((name) => {
                  const isPresent = Boolean(health?.[name]);
                  return (
                    <div
                      key={name}
                      className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-[#F8C8D8]"
                    >
                      <span className="font-mono text-xs sm:text-sm font-medium text-[#5A2A2A]">
                        {name}
                      </span>
                      <span
                        className={`font-mono text-base font-bold ${
                          isPresent ? 'text-emerald-600' : 'text-[#D6336C]'
                        }`}
                        aria-label={isPresent ? 'Configured' : 'Missing'}
                      >
                        {isPresent ? '✓' : '✗'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Database Connectivity Status */}
              <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-[#F8C8D8]">
                <span className="font-fredoka text-sm font-semibold text-[#5A2A2A]">
                  Turso Database Connection (/api/health)
                </span>
                <span
                  className={`font-fredoka text-sm font-bold flex items-center gap-1.5 ${
                    health?.dbConnected ? 'text-emerald-600' : 'text-[#D6336C]'
                  }`}
                >
                  {health?.dbConnected ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Connected (✓)
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" /> Not Connected (✗)
                    </>
                  )}
                </span>
              </div>

              {/* Test Cloudinary Signed Upload + Destroy */}
              <div className="pt-4 border-t border-[#F8C8D8] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-fredoka text-lg font-bold text-[#5A2A2A]">
                      Signed Cloudinary Upload & Destroy Test
                    </h3>
                    <p className="font-fredoka text-xs text-[#5A2A2A]/75">
                      Performs a signed upload of a 1px image to folder &ldquo;love-gift&rdquo;, then deletes it via Cloudinary&apos;s destroy endpoint.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestCloudinary}
                    disabled={testingCloudinary}
                    className="min-h-[42px] px-5 py-2 rounded-xl bg-[#D6336C] text-[#FFF3DC] font-fredoka text-sm font-semibold shadow-[0_3px_0_#5A2A2A] hover:brightness-105 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
                  >
                    {testingCloudinary ? 'Testing Cloudinary...' : 'Test Cloudinary'}
                  </button>
                </div>

                {cloudinaryTestResult && (
                  <div
                    className={`p-4 rounded-2xl border font-fredoka text-sm ${
                      cloudinaryTestResult.ok
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}
                  >
                    <p className="font-bold mb-0.5">
                      {cloudinaryTestResult.ok
                        ? '✓ Cloudinary Test Succeeded'
                        : '✗ Cloudinary Test Failed'}
                    </p>
                    <p className="font-mono text-xs break-all">
                      {cloudinaryTestResult.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
