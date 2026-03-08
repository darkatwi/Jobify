import { useState, useEffect, useRef } from 'react';
import { getProfile, updateProfile } from '../api/profile';
import {
    uploadResume, deleteResume, downloadResumeFile,
    uploadUniversityProof, deleteUniversityProof, downloadUniversityProofFile
} from '../api/ProfileUploads';
import {
    getSkills, addSkill, deleteSkill,
    getEducation, addEducation, updateEducation, deleteEducation,
    getExperience, addExperience, updateExperience, deleteExperience,
    getProjects, addProject, updateProject, deleteProject,
    getInterests, addInterest, deleteInterest
} from '../api/studentData';
import {
    User, GraduationCap, Briefcase, Heart, Code2, FileText,
    TrendingUp, Building2, Settings, ShieldCheck, BarChart3,
    Plus, X, Edit, Trash2, Upload, CheckCircle, AlertCircle,
    Clock, Camera, Moon, Sun, Info, Save, ExternalLink,
    Target, Lightbulb, ChevronDown, Phone, MapPin, Mail, Download,
    GraduationCap as ProofIcon
} from 'lucide-react';
import './styles/profile.css';

import { extractSkillsFromCv } from "../api/cvExtract";

/* ─────────────────────────────────────────────
   Top-level ProfilePage — keeps all API logic
───────────────────────────────────────────── */
const ProfilePage = () => {
    const [profile, setProfile] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({});
    const [darkMode, setDarkMode] = useState(false);
    const [bannerDismissed, setBannerDismissed] = useState(false);

    const [skillsRefreshKey, setSkillsRefreshKey] = useState(0);

    useEffect(() => {
        fetchProfileData();
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
    }, [darkMode]);

    const fetchProfileData = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getProfile();
            setProfile(data.profile);
            setFormData(data.profile);
            setUserRole(data.role);
        } catch (err) {
            setError(err.message || 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(false);
            const result = await updateProfile(formData);
            setProfile(result.profile);
            setFormData(result.profile);
            setUserRole(result.role);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="pf-page">
                <div className="pf-loading">
                    <div className="pf-spinner" />
                    <p>Loading profile…</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="pf-page">
                <div className="pf-alert pf-alert--error">{error || 'Profile not found.'}</div>
            </div>
        );
    }

    if (!userRole) {
        return (
            <div className="pf-page">
                <div className="pf-alert pf-alert--error">{error || 'User role missing.'}</div>
            </div>
        );
    }

    const isStudent = userRole === 'Student';

    return (
        <div className="pf-page">
            {/* ── Header ── */}
            <header className="pf-header">
                <div className="pf-header__inner">
                    <button
                        className="pf-theme-toggle"
                        onClick={() => setDarkMode(d => !d)}
                        aria-label="Toggle theme"
                    >
                        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    <div className="pf-header__body">
                        {/* Avatar */}
                        <div className="pf-avatar-wrap">
                            <div className="pf-avatar">
                                <span>{(profile.fullName || profile.companyName || '?').charAt(0).toUpperCase()}</span>
                            </div>
                            <button className="pf-avatar__cam" aria-label="Change photo">
                                <Camera size={16} />
                            </button>
                        </div>

                        {/* Info */}
                        <div className="pf-header__info">
                            <h1 className="pf-header__name">
                                {profile.fullName || profile.companyName || 'Your Profile'}
                            </h1>
                            <p className="pf-header__sub">
                                {isStudent ? (profile.university || 'Student') : (profile.companyName || 'Recruiter')}
                            </p>
                            <div className="pf-header__badges">
                                <span className="pf-badge pf-badge--blue">{isStudent ? 'Student' : 'Recruiter'}</span>
                                {!isStudent && profile.verificationStatus === 'Verified' && (
                                    <span className="pf-badge pf-badge--green">✓ Verified</span>
                                )}
                            </div>

                            {isStudent && (
                                <div className="pf-strength">
                                    <div className="pf-strength__label">
                                        <span>Profile Strength</span>
                                        <span className="pf-strength__pct">72%</span>
                                    </div>
                                    <div className="pf-strength__bar">
                                        <div className="pf-strength__fill" style={{ width: '72%' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Main ── */}
            <main className="pf-main">

                {/* Welcome banner */}
                {!bannerDismissed && (
                    <div className="pf-banner">
                        <Info size={16} className="pf-banner__icon" />
                        <div className="pf-banner__text">
                            <strong>{isStudent ? 'Complete Your Profile for Better Matches' : 'Set Up Your Recruiter Profile'}</strong>
                            <p>{isStudent
                                ? 'Your profile directly impacts how Jobify matches you with opportunities. Add your skills, experience, and interests.'
                                : 'Complete your organization details and hiring preferences to attract the right candidates.'
                            }</p>
                        </div>
                        <button className="pf-banner__close" onClick={() => setBannerDismissed(true)}>
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* Alerts */}
                {error && <div className="pf-alert pf-alert--error">{error}</div>}
                {success && <div className="pf-alert pf-alert--success">Profile updated successfully!</div>}

                {/* Sections */}
                {isStudent ? (
                    <StudentSections
                        profile={profile}
                        formData={formData}
                        onChange={handleInputChange}
                        onProfileUpdate={setProfile}
                        skillsRefreshKey={skillsRefreshKey}
                        refreshSkills={() => setSkillsRefreshKey(k => k + 1)}
                    />
                ) : (
                    <RecruiterSections profile={profile} formData={formData} onChange={handleInputChange} />
                )}

                {/* Save */}
                <div className="pf-save-row">
                    <button className="pf-btn pf-btn--primary pf-btn--lg" onClick={handleSave} disabled={saving}>
                        <Save size={18} />
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </main>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Student sections
───────────────────────────────────────────── */
const StudentSections = ({ profile, formData, onChange, onProfileUpdate, skillsRefreshKey, refreshSkills }) => (
    <div className="pf-sections">
        <PersonalInfoCard profile={profile} formData={formData} onChange={onChange} />
        <EducationCard profile={profile} />
        <div className="pf-grid-2">
            <SkillsCard refreshKey={skillsRefreshKey} />
            <InterestsCard profile={profile} />
        </div>
        <ExperienceCard profile={profile} />
        <ProjectsCard profile={profile} />
        <div className="pf-grid-2">
            <ResumeCard profile={profile} onProfileUpdate={onProfileUpdate} onSkillsUpdated={refreshSkills} />
            <UniversityProofCard profile={profile} onProfileUpdate={onProfileUpdate} />
        </div>
        <MatchingInsightsCard />
    </div>
);

/* ─────────────────────────────────────────────
   Recruiter sections
───────────────────────────────────────────── */
const RecruiterSections = ({ profile, formData, onChange }) => (
    <div className="pf-sections">
        <OrgInfoCard profile={profile} formData={formData} onChange={onChange} />
        <HiringPrefsCard profile={profile} />
        <div className="pf-grid-2">
            <VerificationCard profile={profile} />
            <ActivityCard profile={profile} />
        </div>
    </div>
);

/* ─────────────────────────────────────────────
   Card shell
───────────────────────────────────────────── */
const Card = ({ icon: Icon, title, subtitle, action, children, highlight }) => (
    <div className={`pf-card ${highlight ? 'pf-card--highlight' : ''}`}>
        <div className="pf-card__head">
            <div className="pf-card__title-row">
                <div className="pf-card__icon-wrap">
                    <Icon size={18} />
                </div>
                <div>
                    <h2 className="pf-card__title">{title}</h2>
                    {subtitle && <p className="pf-card__sub">{subtitle}</p>}
                </div>
            </div>
            {action && <div className="pf-card__action">{action}</div>}
        </div>
        <div className="pf-card__body">{children}</div>
    </div>
);

/* ─────────────────────────────────────────────
   Personal Info
───────────────────────────────────────────── */
const PersonalInfoCard = ({ profile, formData, onChange }) => (
    <Card icon={User} title="Personal Information" subtitle="Your basic details and contact information">
        <div className="pf-form-grid">
            <div className="pf-field">
                <label className="pf-label">Full Name</label>
                <input className="pf-input" name="fullName" value={formData.fullName || ''} onChange={onChange} placeholder="Your full name" />
            </div>
            <div className="pf-field">
                <label className="pf-label">Email</label>
                <div className="pf-input-icon-wrap">
                    <Mail size={15} className="pf-input-icon" />
                    <input className="pf-input pf-input--disabled pf-input--icon" type="email" value={profile.email || ''} disabled />
                </div>
            </div>
        </div>
        <div className="pf-form-grid">
            <div className="pf-field">
                <label className="pf-label">Location</label>
                <div className="pf-input-icon-wrap">
                    <MapPin size={15} className="pf-input-icon" />
                    <input className="pf-input pf-input--icon" name="location" value={formData.location || ''} onChange={onChange} placeholder="City, Country" />
                </div>
            </div>
            <div className="pf-field">
                <label className="pf-label">Phone Number</label>
                <div className="pf-input-icon-wrap">
                    <Phone size={15} className="pf-input-icon" />
                    <input className="pf-input pf-input--icon" name="phoneNumber" value={formData.phoneNumber || ''} onChange={onChange} placeholder="+1 (555) 000-0000" type="tel" />
                </div>
            </div>
        </div>
        <div className="pf-field">
            <label className="pf-label">Portfolio URL</label>
            <input className="pf-input" name="portfolioUrl" value={formData.portfolioUrl || ''} onChange={onChange} placeholder="https://yourportfolio.com" />
        </div>
        <div className="pf-field pf-remote-toggle">
            <div>
                <label className="pf-label">Open to Remote Work</label>
                <p className="pf-hint">Show availability for remote opportunities</p>
            </div>
            <label className="pf-switch">
                <input type="checkbox" defaultChecked />
                <span className="pf-switch__track" />
            </label>
        </div>
        <div className="pf-field">
            <label className="pf-label">About Me</label>
            <textarea className="pf-textarea" name="bio" value={formData.bio || ''} onChange={onChange} rows={4} placeholder="Tell us about yourself…" />
            <span className="pf-char-count">{(formData.bio || '').length} / 500</span>
        </div>
    </Card>
);

/* ─────────────────────────────────────────────
   Education
───────────────────────────────────────────── */
const EducationCard = ({ profile }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ university: '', degree: '', major: '', gpa: '', graduationYear: '' });
    const [editId, setEditId] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        getEducation().then(setItems).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const payload = { university: form.university, degree: form.degree, major: form.major, gpa: form.gpa || null, graduationYear: form.graduationYear };
            if (editId) {
                const updated = await updateEducation(editId, payload);
                setItems(prev => prev.map(i => i.id === editId ? updated : i));
            } else {
                const added = await addEducation(payload);
                setItems(prev => [added, ...prev]);
            }
            setForm({ university: '', degree: '', major: '', gpa: '', graduationYear: '' });
            setEditId(null);
            setOpen(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (item) => {
        setForm({ university: item.university, degree: item.degree, major: item.major, gpa: item.gpa || '', graduationYear: item.graduationYear });
        setEditId(item.id);
        setOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            await deleteEducation(id);
            setItems(prev => prev.filter(i => i.id !== id));
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Card icon={GraduationCap} title="Education" subtitle="Your academic background"
            action={<button className="pf-btn pf-btn--primary pf-btn--sm" onClick={() => { setEditId(null); setForm({ university: '', degree: '', major: '', gpa: '', graduationYear: '' }); setOpen(true); }}><Plus size={14} /> Add</button>}>
            {open && (
                <div className="pf-modal-overlay" onClick={() => setOpen(false)}>
                    <div className="pf-modal" onClick={e => e.stopPropagation()}>
                        <h3 className="pf-modal__title">{editId ? 'Edit' : 'Add'} Education</h3>
                        {error && <div className="pf-alert pf-alert--error">{error}</div>}
                        <form onSubmit={submit} className="pf-modal__form">
                            <div className="pf-field"><label className="pf-label">University</label><input className="pf-input" value={form.university} onChange={e => setForm(f => ({ ...f, university: e.target.value }))} required /></div>
                            <div className="pf-form-grid">
                                <div className="pf-field"><label className="pf-label">Degree</label><input className="pf-input" value={form.degree} onChange={e => setForm(f => ({ ...f, degree: e.target.value }))} placeholder="B.S., M.S." required /></div>
                                <div className="pf-field"><label className="pf-label">Major</label><input className="pf-input" value={form.major} onChange={e => setForm(f => ({ ...f, major: e.target.value }))} required /></div>
                            </div>
                            <div className="pf-form-grid">
                                <div className="pf-field"><label className="pf-label">GPA (optional)</label><input className="pf-input" value={form.gpa} onChange={e => setForm(f => ({ ...f, gpa: e.target.value }))} placeholder="3.8" /></div>
                                <div className="pf-field"><label className="pf-label">Graduation Year</label><input className="pf-input" value={form.graduationYear} onChange={e => setForm(f => ({ ...f, graduationYear: e.target.value }))} placeholder="2025" required /></div>
                            </div>
                            <div className="pf-modal__footer">
                                <button type="button" className="pf-btn pf-btn--outline" onClick={() => setOpen(false)}>Cancel</button>
                                <button type="submit" className="pf-btn pf-btn--primary" disabled={saving}>{saving ? 'Saving…' : editId ? 'Update' : 'Add'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {loading ? <div className="pf-empty"><div className="pf-spinner pf-spinner--sm" /></div> :
                items.length === 0 ? <div className="pf-empty"><GraduationCap size={40} className="pf-empty__icon" /><p>No education added yet</p></div> : (
                    <div className="pf-list">
                        {items.map(item => (
                            <div key={item.id} className="pf-list-item">
                                <div className="pf-list-item__body">
                                    <h4 className="pf-list-item__title">{item.degree} in {item.major}</h4>
                                    <p className="pf-list-item__sub">{item.university}</p>
                                    <p className="pf-list-item__meta">Class of {item.graduationYear}{item.gpa ? ` · GPA: ${item.gpa}` : ''}</p>
                                </div>
                                <div className="pf-list-item__actions">
                                    <button className="pf-icon-btn" onClick={() => startEdit(item)}><Edit size={15} /></button>
                                    <button className="pf-icon-btn pf-icon-btn--danger" onClick={() => handleDelete(item.id)}><Trash2 size={15} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
        </Card>
    );
};

/* ─────────────────────────────────────────────
   Skills
───────────────────────────────────────────── */
const PROFICIENCY = ['Beginner', 'Intermediate', 'Advanced'];

const SkillsCard = ({ refreshKey }) => {
    const [skills, setSkills] = useState([]);
    const [name, setName] = useState('');
    const [proficiency, setProficiency] = useState('Beginner');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        getSkills()
            .then(setSkills)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [refreshKey]);

    const add = async () => {
        if (!name.trim()) return;
        setError(null);
        try {
            const added = await addSkill(name.trim());
            setSkills(prev => [...prev, added]);
            setName('');
        } catch (err) {
            setError(err.message);
        }
    };

    const remove = async (id) => {
        try {
            await deleteSkill(id);
            setSkills(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Card icon={Target} title="Skills" subtitle="Skills directly affect your match score"
            action={skills.length < 3 && (
                <span className="pf-warn-badge"><AlertCircle size={13} /> Add more skills</span>
            )}>
            {error && <div className="pf-alert pf-alert--error">{error}</div>}
            <div className="pf-skill-add">
                <input className="pf-input pf-input--flex" value={name} onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
                    placeholder="e.g. React, Python…" />
                <select className="pf-select" value={proficiency} onChange={e => setProficiency(e.target.value)}>
                    {PROFICIENCY.map(p => <option key={p}>{p}</option>)}
                </select>
                <button className="pf-btn pf-btn--primary" onClick={add}><Plus size={14} /> Add</button>
            </div>

            {loading ? <div className="pf-empty"><div className="pf-spinner pf-spinner--sm" /></div> :
                skills.length > 0 ? (
                    <div className="pf-tags">
                        {skills.map(s => (
                            <span key={s.id} className="pf-tag pf-tag--skill">
                                {s.verified && <CheckCircle size={11} className="pf-tag__verified" />}
                                {s.name}
                                <span className="pf-tag__level">({s.proficiency || proficiency})</span>
                                <button className="pf-tag__remove" onClick={() => remove(s.id)}><X size={11} /></button>
                            </span>
                        ))}
                    </div>
                ) : (
                    <div className="pf-empty"><Target size={36} className="pf-empty__icon" /><p>No skills yet</p></div>
                )}

            <div className="pf-tip">
                <strong>Tip:</strong> Verified skills (✓) come from completed assessments.
            </div>
        </Card>
    );
};

/* ─────────────────────────────────────────────
   Interests
───────────────────────────────────────────── */
const SUGGESTED = ['Artificial Intelligence', 'Web Development', 'Mobile Development', 'Cloud Computing', 'Cybersecurity', 'Data Science', 'UI/UX Design', 'DevOps'];

const InterestsCard = () => {
    const [interests, setInterests] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        getInterests().then(data => setInterests(data)).catch(err => setError(err.message)).finally(() => setLoading(false));
    }, []);

    const add = async (val) => {
        const v = (val || input).trim();
        if (!v || interests.find(i => i.interest === v)) return;
        setError(null);
        try {
            const added = await addInterest(v);
            setInterests(prev => [...prev, added]);
            setInput('');
        } catch (err) {
            setError(err.message);
        }
    };

    const remove = async (id) => {
        try {
            await deleteInterest(id);
            setInterests(prev => prev.filter(i => i.id !== id));
        } catch (err) {
            setError(err.message);
        }
    };

    const interestNames = interests.map(i => i.interest);

    return (
        <Card icon={Heart} title="Interests" subtitle="Areas you're passionate about">
            {error && <div className="pf-alert pf-alert--error">{error}</div>}
            <div className="pf-skill-add">
                <input className="pf-input pf-input--flex" value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
                    placeholder="Add an interest" />
                <button className="pf-btn pf-btn--primary" onClick={() => add()}><Plus size={14} /> Add</button>
            </div>

            {loading ? <div className="pf-empty"><div className="pf-spinner pf-spinner--sm" /></div> : interests.length > 0 && (
                <div>
                    <p className="pf-subsection-label">Your Interests</p>
                    <div className="pf-tags">
                        {interests.map(i => (
                            <span key={i.id} className="pf-tag pf-tag--interest">
                                {i.interest}
                                <button className="pf-tag__remove" onClick={() => remove(i.id)}><X size={11} /></button>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <p className="pf-subsection-label">Suggested (click to add)</p>
                <div className="pf-tags">
                    {SUGGESTED.filter(s => !interestNames.includes(s)).map(s => (
                        <button key={s} className="pf-tag pf-tag--suggestion" onClick={() => add(s)}>
                            <Plus size={11} /> {s}
                        </button>
                    ))}
                </div>
            </div>
        </Card>
    );
};

/* ─────────────────────────────────────────────
   Experience
───────────────────────────────────────────── */
const ExperienceCard = () => {
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ role: '', company: '', duration: '', description: '' });
    const [editId, setEditId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        getExperience().then(setItems).catch(err => setError(err.message)).finally(() => setLoading(false));
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const payload = { role: form.role, company: form.company, duration: form.duration, description: form.description };
            if (editId) {
                const updated = await updateExperience(editId, payload);
                setItems(prev => prev.map(i => i.id === editId ? updated : i));
            } else {
                const added = await addExperience(payload);
                setItems(prev => [added, ...prev]);
            }
            setForm({ role: '', company: '', duration: '', description: '' });
            setEditId(null);
            setOpen(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (item) => {
        setForm({ role: item.role, company: item.company, duration: item.duration, description: item.description });
        setEditId(item.id);
        setOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            await deleteExperience(id);
            setItems(prev => prev.filter(x => x.id !== id));
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Card icon={Briefcase} title="Experience" subtitle="Your professional background"
            action={<button className="pf-btn pf-btn--primary pf-btn--sm" onClick={() => { setEditId(null); setForm({ role: '', company: '', duration: '', description: '' }); setOpen(true); }}><Plus size={14} /> Add</button>}>

            {open && (
                <div className="pf-modal-overlay" onClick={() => setOpen(false)}>
                    <div className="pf-modal" onClick={e => e.stopPropagation()}>
                        <h3 className="pf-modal__title">{editId ? 'Edit' : 'Add'} Experience</h3>
                        {error && <div className="pf-alert pf-alert--error">{error}</div>}
                        <form onSubmit={submit} className="pf-modal__form">
                            <div className="pf-field">
                                <label className="pf-label">Role / Position</label>
                                <input className="pf-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Software Engineer Intern" required />
                            </div>
                            <div className="pf-field">
                                <label className="pf-label">Company</label>
                                <input className="pf-input" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} required />
                            </div>
                            <div className="pf-field">
                                <label className="pf-label">Duration</label>
                                <input className="pf-input" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="Jun 2024 – Aug 2024" required />
                            </div>
                            <div className="pf-field">
                                <label className="pf-label">Description</label>
                                <textarea className="pf-textarea" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="• Key responsibilities and achievements" required />
                            </div>
                            <div className="pf-modal__footer">
                                <button type="button" className="pf-btn pf-btn--outline" onClick={() => setOpen(false)}>Cancel</button>
                                <button type="submit" className="pf-btn pf-btn--primary" disabled={saving}>{saving ? 'Saving…' : editId ? 'Update' : 'Add'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {loading ? <div className="pf-empty"><div className="pf-spinner pf-spinner--sm" /></div> :
                items.length === 0 ? (
                    <div className="pf-empty"><Briefcase size={40} className="pf-empty__icon" /><p>No experience added yet</p></div>
                ) : (
                    <div className="pf-timeline">
                        {items.map((exp, i) => (
                            <div key={exp.id} className={`pf-timeline-item ${i < items.length - 1 ? 'pf-timeline-item--line' : ''}`}>
                                <div className="pf-timeline-dot"><Briefcase size={14} /></div>
                                <div className="pf-timeline-content">
                                    <div className="pf-list-item">
                                        <div className="pf-list-item__body">
                                            <h4 className="pf-list-item__title">{exp.role}</h4>
                                            <p className="pf-list-item__company">{exp.company}</p>
                                            <p className="pf-list-item__meta">{exp.duration}</p>
                                            <p className="pf-list-item__desc">{exp.description}</p>
                                        </div>
                                        <div className="pf-list-item__actions">
                                            <button className="pf-icon-btn" onClick={() => startEdit(exp)}><Edit size={15} /></button>
                                            <button className="pf-icon-btn pf-icon-btn--danger" onClick={() => handleDelete(exp.id)}><Trash2 size={15} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
        </Card>
    );
};

/* ─────────────────────────────────────────────
   Projects
───────────────────────────────────────────── */
const ProjectsCard = () => {
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', tech: '', links: '' });
    const [editId, setEditId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        getProjects().then(data => setItems(data.map(p => ({
            ...p,
            techStack: Array.isArray(p.techStack) ? p.techStack : (p.techStack || '').split(',').map(t => t.trim()).filter(Boolean)
        })))).catch(err => setError(err.message)).finally(() => setLoading(false));
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        const techStack = form.tech.split(',').map(t => t.trim()).filter(Boolean);
        try {
            const payload = { title: form.title, description: form.description, techStack, links: form.links || null };
            if (editId) {
                const updated = await updateProject(editId, payload);
                setItems(prev => prev.map(i => i.id === editId ? {
                    ...updated,
                    techStack: Array.isArray(updated.techStack) ? updated.techStack : (updated.techStack || '').split(',').map(t => t.trim()).filter(Boolean)
                } : i));
            } else {
                const added = await addProject(payload);
                setItems(prev => [{
                    ...added,
                    techStack: Array.isArray(added.techStack) ? added.techStack : (added.techStack || '').split(',').map(t => t.trim()).filter(Boolean)
                }, ...prev]);
            }
            setForm({ title: '', description: '', tech: '', links: '' });
            setEditId(null);
            setOpen(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (item) => {
        setForm({ title: item.title, description: item.description, tech: (item.techStack || []).join(', '), links: item.links || '' });
        setEditId(item.id);
        setOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            await deleteProject(id);
            setItems(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Card icon={Code2} title="Projects" subtitle="Showcase your best work"
            action={<button className="pf-btn pf-btn--primary pf-btn--sm" onClick={() => { setEditId(null); setForm({ title: '', description: '', tech: '', links: '' }); setOpen(true); }}><Plus size={14} /> Add</button>}>

            {open && (
                <div className="pf-modal-overlay" onClick={() => setOpen(false)}>
                    <div className="pf-modal" onClick={e => e.stopPropagation()}>
                        <h3 className="pf-modal__title">{editId ? 'Edit' : 'Add'} Project</h3>
                        {error && <div className="pf-alert pf-alert--error">{error}</div>}
                        <form onSubmit={submit} className="pf-modal__form">
                            <div className="pf-field">
                                <label className="pf-label">Project Title</label>
                                <input className="pf-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                            </div>
                            <div className="pf-field">
                                <label className="pf-label">Description</label>
                                <textarea className="pf-textarea" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
                            </div>
                            <div className="pf-field">
                                <label className="pf-label">Tech Stack (comma-separated)</label>
                                <input className="pf-input" value={form.tech} onChange={e => setForm(f => ({ ...f, tech: e.target.value }))} placeholder="React, Python, Flask" />
                            </div>
                            <div className="pf-field">
                                <label className="pf-label">Link (optional)</label>
                                <input className="pf-input" value={form.links} onChange={e => setForm(f => ({ ...f, links: e.target.value }))} placeholder="github.com/user/project" />
                            </div>
                            <div className="pf-modal__footer">
                                <button type="button" className="pf-btn pf-btn--outline" onClick={() => setOpen(false)}>Cancel</button>
                                <button type="submit" className="pf-btn pf-btn--primary" disabled={saving}>{saving ? 'Saving…' : editId ? 'Update' : 'Add'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {loading ? <div className="pf-empty"><div className="pf-spinner pf-spinner--sm" /></div> :
                items.length === 0 ? (
                    <div className="pf-empty"><Code2 size={40} className="pf-empty__icon" /><p>No projects yet. Showcase your work!</p></div>
                ) : (
                    <div className="pf-list">
                        {items.map(proj => (
                            <div key={proj.id} className="pf-list-item">
                                <div className="pf-list-item__body">
                                    <h4 className="pf-list-item__title">
                                        {proj.title}
                                        {proj.links && (
                                            <a href={`https://${proj.links}`} target="_blank" rel="noopener noreferrer" className="pf-ext-link">
                                                <ExternalLink size={13} />
                                            </a>
                                        )}
                                    </h4>
                                    <p className="pf-list-item__desc">{proj.description}</p>
                                    <div className="pf-tags pf-tags--sm">
                                        {(proj.techStack || []).map(t => <span key={t} className="pf-tag pf-tag--tech">{t}</span>)}
                                    </div>
                                </div>
                                <div className="pf-list-item__actions">
                                    <button className="pf-icon-btn" onClick={() => startEdit(proj)}><Edit size={15} /></button>
                                    <button className="pf-icon-btn pf-icon-btn--danger" onClick={() => handleDelete(proj.id)}><Trash2 size={15} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
        </Card>
    );
};

/* ─────────────────────────────────────────────
   Resume — wired to real API
───────────────────────────────────────────── */
const normalizeSkill = (s) => (s || "").trim().toLowerCase();
const ResumeCard = ({ profile, onProfileUpdate, onSkillsUpdated }) => {
    const [hasResume, setHasResume] = useState(profile?.hasResume || false);
    const [uploadedAt, setUploadedAt] = useState(profile?.resumeUploadedAtUtc || null);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [progress, setProgress] = useState("");
    const [error, setError] = useState(null);
    const fileRef = useRef();


    const handleFile = async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;

        setError(null);
        setUploading(true);
        setProgress("Uploading CV...");

        try {
            // 1) SAVE resume file (backend)
            const saved = await uploadResume(f);

            // 2) EXTRACT skills
            setProgress("Extracting skills...");
            const extracted = await extractSkillsFromCv(f);
            const extractedSkills = (extracted.skills || []).map(normalizeSkill);

            // 3) Save skills to DB (avoid duplicates)
            setProgress("Saving skills...");
            const existing = await getSkills();
            const existingSet = new Set(existing.map(x => normalizeSkill(x.name)));

            for (const sk of extractedSkills) {
                if (!sk || existingSet.has(sk)) continue;
                await addSkill(sk);
                existingSet.add(sk);
            }

            // ✅ 4) ONLY NOW update UI to show resume is “on file”
            setHasResume(true);
            setUploadedAt(saved.profile?.resumeUploadedAtUtc || new Date().toISOString());
            onProfileUpdate?.(prev => ({ ...prev, hasResume: true }));

            // refresh skills card UI
            onSkillsUpdated?.();

        } catch (err) {
            setError(err.message || "Upload failed");
        } finally {
            setUploading(false);
            setProgress("");
            fileRef.current.value = "";
        }
    };
    const deleteAllSkills = async () => {
        const skills = await getSkills(); // [{id, name, ...}]
        await Promise.all(skills.map(s => deleteSkill(s.id)));
    };

    const handleDelete = async () => {
        if (!confirm("Remove your resume? This will also delete your skills.")) return;

        setDeleting(true);
        setError(null);

        try {
            // delete resume
            await deleteResume();

            // delete skills (from DB)
            await deleteAllSkills();

            // update UI
            setHasResume(false);
            setUploadedAt(null);
            onProfileUpdate?.(prev => ({ ...prev, hasResume: false }));

            // refresh skills card
            onSkillsUpdated?.();

        } catch (err) {
            setError(err.message || "Delete failed");
        } finally {
            setDeleting(false);
        }
    };

    const handleDownload = async () => {
        try {
            await downloadResumeFile();
        } catch (err) {
            setError(err.message || 'Download failed');
        }
    };

    const formatDate = (iso) => {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return (
        <Card icon={FileText} title="Resume / CV" subtitle="Upload your resume to increase visibility" highlight>
            {error && <div className="pf-alert pf-alert--error">{error}</div>}

            {hasResume ? (
                <div className="pf-resume-uploaded">
                    <div className="pf-resume-file">
                        <div className="pf-resume-icon"><FileText size={20} /></div>
                        <div className="pf-resume-file__info">
                            <p className="pf-resume-name">Resume on file</p>
                            {uploadedAt && <p className="pf-resume-size">Uploaded {formatDate(uploadedAt)}</p>}
                            <span className="pf-badge pf-badge--green pf-badge--sm"><CheckCircle size={11} /> Used for matching</span>
                        </div>
                        <div className="pf-resume-file__actions">
                            <button className="pf-icon-btn" onClick={handleDownload} title="Download"><Download size={15} /></button>
                            <button className="pf-icon-btn pf-icon-btn--danger" onClick={handleDelete} disabled={deleting} title="Remove">
                                <Trash2 size={15} />
                            </button>
                        </div>
                    </div>
                    <button className="pf-btn pf-btn--outline pf-btn--full" onClick={() => fileRef.current?.click()} disabled={uploading}>
                        <Upload size={15} /> {uploading ? 'Uploading…' : 'Replace Resume'}
                    </button>
                </div>
            ) : (
                <div>
                    <div className="pf-dropzone" onClick={() => fileRef.current?.click()}>
                        {uploading ? <div className="pf-spinner pf-spinner--sm" /> : <Upload size={36} className="pf-dropzone__icon" />}
                        <p className="pf-dropzone__label">{uploading ? 'Uploading…' : 'Click to upload resume'}</p>
                        <p className="pf-dropzone__sub">PDF or DOC up to 10MB</p>
                    </div>
                    <button className="pf-btn pf-btn--primary pf-btn--full" onClick={() => fileRef.current?.click()} disabled={uploading}>
                        <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload Resume'}
                    </button>
                </div>
            )}

            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleFile} hidden />

            <div className="pf-tip">
                <strong>Why upload?</strong> Recruiters can view your resume and our AI uses it to improve match scores.
            </div>
        </Card>
    );
};

/* ─────────────────────────────────────────────
   University Proof — wired to real API
───────────────────────────────────────────── */
const UniversityProofCard = ({ profile, onProfileUpdate }) => {
    const [hasProof, setHasProof] = useState(profile?.hasUniversityProof || false);
    const [uploadedAt, setUploadedAt] = useState(profile?.universityProofUploadedAtUtc || null);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState(null);
    const fileRef = useRef();

    const handleFile = async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setError(null);
        setUploading(true);
        try {
            const res = await uploadUniversityProof(f);
            setHasProof(true);
            setUploadedAt(res.profile?.universityProofUploadedAtUtc || new Date().toISOString());
            onProfileUpdate?.(prev => ({ ...prev, hasUniversityProof: true }));
        } catch (err) {
            setError(err.message || 'Upload failed');
        } finally {
            setUploading(false);
            fileRef.current.value = '';
        }
    };

    const handleDelete = async () => {
        if (!confirm('Remove your university proof?')) return;
        setDeleting(true);
        setError(null);
        try {
            await deleteUniversityProof();
            setHasProof(false);
            setUploadedAt(null);
            onProfileUpdate?.(prev => ({ ...prev, hasUniversityProof: false }));
        } catch (err) {
            setError(err.message || 'Delete failed');
        } finally {
            setDeleting(false);
        }
    };

    const handleDownload = async () => {
        try {
            await downloadUniversityProofFile();
        } catch (err) {
            setError(err.message || 'Download failed');
        }
    };

    const formatDate = (iso) => {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return (
        <Card icon={GraduationCap} title="University Proof" subtitle="Proof of enrollment or university ID" highlight>
            {error && <div className="pf-alert pf-alert--error">{error}</div>}

            {hasProof ? (
                <div className="pf-resume-uploaded">
                    <div className="pf-resume-file pf-resume-file--proof">
                        <div className="pf-resume-icon pf-resume-icon--proof"><GraduationCap size={20} /></div>
                        <div className="pf-resume-file__info">
                            <p className="pf-resume-name">Proof on file</p>
                            {uploadedAt && <p className="pf-resume-size">Uploaded {formatDate(uploadedAt)}</p>}
                            <span className="pf-badge pf-badge--blue pf-badge--sm"><CheckCircle size={11} /> Submitted</span>
                        </div>
                        <div className="pf-resume-file__actions">
                            <button className="pf-icon-btn" onClick={handleDownload} title="Download"><Download size={15} /></button>
                            <button className="pf-icon-btn pf-icon-btn--danger" onClick={handleDelete} disabled={deleting} title="Remove">
                                <Trash2 size={15} />
                            </button>
                        </div>
                    </div>
                    <button className="pf-btn pf-btn--outline pf-btn--full" onClick={() => fileRef.current?.click()} disabled={uploading}>
                        <Upload size={15} /> {uploading ? 'Uploading…' : 'Replace Proof'}
                    </button>
                </div>
            ) : (
                <div>
                    <div className="pf-dropzone" onClick={() => fileRef.current?.click()}>
                        {uploading ? <div className="pf-spinner pf-spinner--sm" /> : <GraduationCap size={36} className="pf-dropzone__icon" />}
                        <p className="pf-dropzone__label">{uploading ? 'Uploading…' : 'Upload university proof'}</p>
                        <p className="pf-dropzone__sub">Upload a clear, cropped image showing the document text only</p>
                    </div>
                    <button className="pf-btn pf-btn--primary pf-btn--full" onClick={() => fileRef.current?.click()} disabled={uploading}>
                        <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload Proof'}
                    </button>
                </div>
            )}

            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFile} hidden />

            <div className="pf-tip">
                <strong>Why verify?</strong> Verified students get a trust badge visible to recruiters, improving application rates.
            </div>
        </Card>
    );
};

/* ─────────────────────────────────────────────
   Matching Insights
───────────────────────────────────────────── */
const MatchingInsightsCard = () => {
    const metrics = [
        { label: 'Skill Coverage', value: 60, icon: Target },
        { label: 'Experience Alignment', value: 20, icon: Briefcase },
        { label: 'Interest Match Strength', value: 67, icon: Heart },
        { label: 'Profile Completeness', value: 60, icon: TrendingUp },
    ];

    return (
        <Card icon={TrendingUp} title="How Jobify Sees Your Profile" subtitle="Insights on your matching potential" highlight>
            <div className="pf-metrics">
                {metrics.map(m => {
                    const Icon = m.icon;
                    return (
                        <div key={m.label} className="pf-metric">
                            <div className="pf-metric__header">
                                <div className="pf-metric__label"><Icon size={14} /> {m.label}</div>
                                <span className="pf-metric__pct">{m.value}%</span>
                            </div>
                            <div className="pf-progress"><div className="pf-progress__fill" style={{ width: `${m.value}%` }} /></div>
                        </div>
                    );
                })}
            </div>
            <div className="pf-suggestions">
                <div className="pf-suggestions__title"><Lightbulb size={14} /> Suggestions to Improve</div>
                {['Add 3 more skills to improve match quality', 'Upload CV to increase visibility by 40%', 'Add a project to showcase practical experience'].map((s, i) => (
                    <div key={i} className="pf-suggestion">
                        <span className="pf-suggestion__num">{i + 1}</span>
                        <span>{s}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
};

/* ─────────────────────────────────────────────
   Recruiter — Org Info
───────────────────────────────────────────── */
const OrgInfoCard = ({ profile, formData, onChange }) => (
    <Card icon={Building2} title="Organization Information" subtitle="Company details and branding">
        <div className="pf-org-logo-row">
            <div className="pf-org-logo">
                <Building2 size={28} />
            </div>
            <button className="pf-btn pf-btn--outline"><Upload size={14} /> Upload Logo</button>
        </div>
        <div className="pf-form-grid">
            <div className="pf-field">
                <label className="pf-label">Company Name</label>
                <input className="pf-input" name="companyName" value={formData.companyName || ''} onChange={onChange} placeholder="Acme Corp" required />
            </div>
            <div className="pf-field">
                <label className="pf-label">Industry</label>
                <select className="pf-select pf-select--full" name="industry">
                    {['Technology', 'Finance', 'Healthcare', 'Education', 'Retail', 'Consulting', 'Other'].map(v => <option key={v}>{v}</option>)}
                </select>
            </div>
        </div>
        <div className="pf-form-grid">
            <div className="pf-field">
                <label className="pf-label">Organization Size</label>
                <select className="pf-select pf-select--full" name="orgSize">
                    {['1-10', '11-50', '51-200', '201-500', '500-1000', '1000+'].map(v => <option key={v}>{v} employees</option>)}
                </select>
            </div>
            <div className="pf-field">
                <label className="pf-label">Website</label>
                <input className="pf-input" name="websiteUrl" value={formData.websiteUrl || ''} onChange={onChange} placeholder="company.com" />
            </div>
        </div>
        <div className="pf-field">
            <label className="pf-label">Location</label>
            <input className="pf-input" name="location" value={formData.location || ''} onChange={onChange} placeholder="City, Country" />
        </div>
    </Card>
);

/* ─────────────────────────────────────────────
   Recruiter — Hiring Prefs
───────────────────────────────────────────── */
const HIRING_LEVELS = ['Interns', 'Junior Developers', 'Mid-level Developers', 'Senior Developers', 'Tech Leads'];

const HiringPrefsCard = () => {
    const [focus, setFocus] = useState(['Interns']);
    const [skills, setSkills] = useState(['React', 'Python']);
    const [skillInput, setSkillInput] = useState('');

    const toggle = (l) => setFocus(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
    const addSkill = () => {
        if (skillInput.trim() && !skills.includes(skillInput.trim())) {
            setSkills(prev => [...prev, skillInput.trim()]);
            setSkillInput('');
        }
    };

    return (
        <Card icon={Settings} title="Role & Hiring Preferences" subtitle="What type of talent you're looking for">
            <div className="pf-field">
                <label className="pf-label">Your Role / Title</label>
                <input className="pf-input" defaultValue="Talent Acquisition Manager" />
            </div>
            <div className="pf-field">
                <label className="pf-label">Hiring Focus</label>
                <p className="pf-hint">Select the experience levels you typically hire</p>
                <div className="pf-checkboxes">
                    {HIRING_LEVELS.map(l => (
                        <label key={l} className="pf-checkbox-label">
                            <input type="checkbox" checked={focus.includes(l)} onChange={() => toggle(l)} className="pf-checkbox" />
                            {l}
                        </label>
                    ))}
                </div>
            </div>
            <div className="pf-field">
                <label className="pf-label">Skills Frequently Assessed</label>
                <div className="pf-skill-add">
                    <input className="pf-input pf-input--flex" value={skillInput} onChange={e => setSkillInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} placeholder="Add a skill" />
                    <button className="pf-btn pf-btn--primary" onClick={addSkill}><Plus size={14} /> Add</button>
                </div>
                {skills.length > 0 && (
                    <div className="pf-tags">
                        {skills.map(s => (
                            <span key={s} className="pf-tag pf-tag--skill">
                                {s}
                                <button className="pf-tag__remove" onClick={() => setSkills(prev => prev.filter(x => x !== s))}><X size={11} /></button>
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <div className="pf-field">
                <label className="pf-label">Preferred Work Mode</label>
                <select className="pf-select pf-select--full">
                    {['Remote', 'On-site', 'Hybrid', 'Flexible'].map(v => <option key={v}>{v}</option>)}
                </select>
            </div>
        </Card>
    );
};

/* ─────────────────────────────────────────────
   Recruiter — Verification
───────────────────────────────────────────── */
const VerificationCard = ({ profile }) => {
    const verified = profile.verificationStatus === 'Verified';
    return (
        <Card icon={ShieldCheck} title="Verification & Trust" subtitle="Your account verification status" highlight>
            <div className={`pf-verify-status ${verified ? 'pf-verify-status--green' : 'pf-verify-status--yellow'}`}>
                {verified ? <CheckCircle size={20} /> : <Clock size={20} />}
                <div>
                    <div className="pf-verify-status__row">
                        <strong>Verification Status</strong>
                        <span className={`pf-badge ${verified ? 'pf-badge--green' : 'pf-badge--yellow'}`}>
                            {verified ? '✓ Verified' : '⏳ Pending'}
                        </span>
                    </div>
                    <p className="pf-hint">{verified
                        ? 'Your account is verified. Candidates can trust your opportunities.'
                        : 'Verification pending. This typically takes 1-2 business days.'
                    }</p>
                </div>
            </div>
            <div className="pf-benefits">
                <p className="pf-subsection-label">Benefits of Being Verified</p>
                {['Higher candidate trust and response rates', 'Priority in candidate search results', 'Verified badge on all your opportunities', 'Access to premium matching features'].map(b => (
                    <div key={b} className="pf-benefit"><CheckCircle size={14} className="pf-benefit__icon" />{b}</div>
                ))}
            </div>
            {!verified && <button className="pf-btn pf-btn--outline pf-btn--full">Check Verification Status</button>}
        </Card>
    );
};

/* ─────────────────────────────────────────────
   Recruiter — Activity
───────────────────────────────────────────── */
const ActivityCard = ({ profile }) => {
    const stats = [
        { label: 'Active Opportunities', value: 12, color: 'blue', icon: Briefcase },
        { label: 'Candidates Reviewed', value: 87, color: 'purple', icon: User },
        { label: 'Interviews Scheduled', value: 15, color: 'green', icon: TrendingUp },
    ];

    return (
        <Card icon={BarChart3} title="Activity Snapshot" subtitle="Your recent hiring activity">
            <div className="pf-stats">
                {stats.map(s => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className={`pf-stat pf-stat--${s.color}`}>
                            <div className="pf-stat__icon"><Icon size={18} /></div>
                            <div>
                                <p className="pf-stat__value">{s.value}</p>
                                <p className="pf-stat__label">{s.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

export default ProfilePage;
