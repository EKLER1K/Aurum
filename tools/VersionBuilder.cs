using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;

namespace AurumVersionBuilder
{
    internal static class Program
    {
        [STAThread]
        private static void Main(string[] args)
        {
            int cliExit = Cli.TryRun(args);
            if (cliExit >= 0)
            {
                Environment.Exit(cliExit);
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }

    /// <summary>
    /// Небольшой CLI для проверки и автоматизации: --update 1.05 [--beta|--stable] [--code 7].
    /// Без аргументов открывается окно.
    /// </summary>
    internal static class Cli
    {
        public static int TryRun(string[] args)
        {
            string version = null;
            bool? beta = null;
            int? code = null;

            for (int i = 0; i < args.Length; i++)
            {
                string arg = args[i];
                if (arg == "--update" && i + 1 < args.Length)
                {
                    version = args[++i];
                }
                else if (arg == "--beta")
                {
                    beta = true;
                }
                else if (arg == "--stable")
                {
                    beta = false;
                }
                else if (arg == "--code" && i + 1 < args.Length)
                {
                    int parsed;
                    if (int.TryParse(args[++i], out parsed)) code = parsed;
                }
            }

            if (version == null) return -1;

            try
            {
                string root = VersionFiles.FindRoot();
                if (root == null) return 3;

                VersionState state = VersionFiles.Read(root);
                bool isBeta = beta.HasValue ? beta.Value : state.Beta;
                int nextCode = code.HasValue ? code.Value : state.Code + 1;
                VersionFiles.Apply(root, version, isBeta, nextCode);
                return 0;
            }
            catch
            {
                return 4;
            }
        }
    }

    internal sealed class VersionState
    {
        public string Display;
        public string Short;
        public string Semver;
        public bool Beta;
        public int Code;

        public string Label { get { return "V" + Display; } }
        public string ArtifactBase { get { return "Aurum-" + Short + (Beta ? "-Beta" : ""); } }
    }

    internal sealed class ApplyResult
    {
        public string OldDisplay;
        public string Display;
        public string ArtifactBase;
        public readonly List<string> ChangedFiles = new List<string>();
    }

    internal static class VersionFiles
    {
        private static readonly Encoding Utf8NoBom = new UTF8Encoding(false);

        public static string FindRoot()
        {
            string dir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
            for (int i = 0; i < 6; i++)
            {
                if (File.Exists(Path.Combine(dir, "package.json")) &&
                    File.Exists(Path.Combine(dir, "src", "lib", "version.ts")) &&
                    File.Exists(Path.Combine(dir, "android", "app", "build.gradle")))
                {
                    return dir;
                }

                DirectoryInfo parent = Directory.GetParent(dir);
                if (parent == null) break;
                dir = parent.FullName;
            }

            string cwd = Directory.GetCurrentDirectory();
            if (File.Exists(Path.Combine(cwd, "package.json"))) return cwd;
            return null;
        }

        public static VersionState Read(string root)
        {
            string source = File.ReadAllText(Path.Combine(root, "src", "lib", "version.ts"), Encoding.UTF8);
            Match displayMatch = Regex.Match(source, "APP_VERSION\\s*=\\s*\"V([^\"]*)\"");
            if (!displayMatch.Success)
            {
                throw new InvalidOperationException("В src\\lib\\version.ts не найдена константа APP_VERSION.");
            }

            Match semverMatch = Regex.Match(source, "APP_VERSION_NUMBER\\s*=\\s*\"([^\"]*)\"");
            string display = displayMatch.Groups[1].Value;

            VersionState state = new VersionState();
            state.Display = display;
            state.Beta = display.EndsWith(" Beta", StringComparison.Ordinal);
            state.Short = state.Beta ? display.Substring(0, display.Length - 5) : display;
            state.Semver = semverMatch.Success ? semverMatch.Groups[1].Value : "";

            string gradle = File.ReadAllText(Path.Combine(root, "android", "app", "build.gradle"), Encoding.UTF8);
            Match codeMatch = Regex.Match(gradle, "versionCode\\s+(\\d+)");
            int code;
            state.Code = codeMatch.Success && int.TryParse(codeMatch.Groups[1].Value, out code) ? code : 0;
            return state;
        }

        public static string Normalize(string input, out string error)
        {
            error = null;
            string version = (input ?? "").Trim();
            if (version.StartsWith("v", StringComparison.OrdinalIgnoreCase))
            {
                version = version.Substring(1).Trim();
            }

            if (!Regex.IsMatch(version, "^\\d{1,3}\\.\\d{1,3}(\\.\\d{1,3})?$"))
            {
                error = "Версия должна выглядеть как 1.05 или 1.0.5";
                return null;
            }

            string[] parts = version.Split('.');
            for (int i = 0; i < parts.Length; i++)
            {
                int number;
                if (!int.TryParse(parts[i], out number) || number > 999)
                {
                    error = "Каждая часть версии — число от 0 до 999";
                    return null;
                }
            }

            return version;
        }

        /// <summary>1.05 → 1.0.5, 1.0.5 → 1.0.5.</summary>
        public static string ToSemver(string version)
        {
            string[] parts = version.Split('.');
            if (parts.Length == 2)
            {
                return int.Parse(parts[0]).ToString() + ".0." + int.Parse(parts[1]).ToString();
            }

            return int.Parse(parts[0]).ToString() + "." +
                   int.Parse(parts[1]).ToString() + "." +
                   int.Parse(parts[2]).ToString();
        }

        public static ApplyResult Apply(string root, string version, bool beta, int code)
        {
            string error;
            string normalized = Normalize(version, out error);
            if (normalized == null) throw new ArgumentException(error);
            if (code < 1) throw new ArgumentException("versionCode должен быть положительным числом.");

            VersionState old = Read(root);
            string display = normalized + (beta ? " Beta" : "");
            string artifact = "Aurum-" + normalized + (beta ? "-Beta" : "");
            string semver = ToSemver(normalized);

            ApplyResult result = new ApplyResult();
            result.OldDisplay = old.Display;
            result.Display = display;
            result.ArtifactBase = artifact;

            string versionPath = Path.Combine(root, "src", "lib", "version.ts");
            string versionSource = File.ReadAllText(versionPath, Encoding.UTF8);
            string updated = Regex.Replace(versionSource,
                "(APP_VERSION_NUMBER\\s*=\\s*\")[^\"]*(\")", "${1}" + semver + "${2}");
            updated = Regex.Replace(updated,
                "(APP_VERSION\\s*=\\s*\")[^\"]*(\")", "${1}V" + display + "${2}");
            WriteIfChanged(root, versionPath, versionSource, updated, result);

            string packagePath = Path.Combine(root, "package.json");
            string packageJson = File.ReadAllText(packagePath, Encoding.UTF8);
            updated = Regex.Replace(packageJson,
                "(\"version\"\\s*:\\s*\")[^\"]*(\")", "${1}" + semver + "${2}");
            WriteIfChanged(root, packagePath, packageJson, updated, result);

            string gradlePath = Path.Combine(root, "android", "app", "build.gradle");
            string gradle = File.ReadAllText(gradlePath, Encoding.UTF8);
            updated = Regex.Replace(gradle, "versionCode\\s+\\d+", "versionCode " + code);
            updated = Regex.Replace(updated, "versionName\\s+\"[^\"]*\"", "versionName \"" + display + "\"");
            WriteIfChanged(root, gradlePath, gradle, updated, result);

            string readmePath = Path.Combine(root, "README.md");
            if (File.Exists(readmePath))
            {
                string readme = File.ReadAllText(readmePath, Encoding.UTF8);
                updated = readme;

                string oldArtifact = "Aurum-" + old.Short + (old.Beta ? "-Beta" : "");
                if (oldArtifact != artifact)
                {
                    updated = updated.Replace(oldArtifact, artifact);
                }

                updated = Regex.Replace(updated,
                    "Текущая версия[^\\r\\n]*\\*\\*V[^*]+\\*\\*",
                    "Текущая версия - **V" + display + "**");
                updated = Regex.Replace(updated,
                    "(version\\.ts\\s+#\\s*)V[^\\r\\n]*", "${1}V" + display);

                WriteIfChanged(root, readmePath, readme, updated, result);
            }

            return result;
        }

        private static void WriteIfChanged(string root, string path, string before, string after, ApplyResult result)
        {
            if (before == after) return;
            File.WriteAllText(path, after, Utf8NoBom);

            string relative = path.StartsWith(root, StringComparison.OrdinalIgnoreCase)
                ? path.Substring(root.Length).TrimStart(Path.DirectorySeparatorChar)
                : path;
            result.ChangedFiles.Add(relative);
        }
    }

    internal sealed class MainForm : Form
    {
        private static readonly Color Bg = Color.FromArgb(10, 10, 11);
        private static readonly Color Card = Color.FromArgb(20, 20, 22);
        private static readonly Color Line = Color.FromArgb(44, 44, 48);
        private static readonly Color Gold = Color.FromArgb(212, 168, 83);
        private static readonly Color GoldHover = Color.FromArgb(228, 186, 104);
        private static readonly Color Fg = Color.FromArgb(240, 240, 244);
        private static readonly Color Muted = Color.FromArgb(150, 150, 158);
        private static readonly Color Green = Color.FromArgb(88, 214, 141);
        private static readonly Color Red = Color.FromArgb(248, 113, 113);

        private readonly string _root;
        private VersionState _state;
        private bool _running;

        private TextBox _versionBox;
        private CheckBox _betaBox;
        private NumericUpDown _codeBox;
        private Label _preview;
        private Label _current;
        private Label _status;
        private TextBox _log;
        private Button _buildButton;
        private Button _versionButton;
        private Button _distButton;
        private ProgressBar _progress;

        public MainForm()
        {
            _root = VersionFiles.FindRoot();

            Text = "Aurum — сборка версии";
            try
            {
                Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            }
            catch
            {
                // без иконки окно всё равно откроется
            }
            BackColor = Bg;
            ForeColor = Fg;
            Font = new Font("Segoe UI", 9F);
            ClientSize = new Size(640, 632);
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            AutoScaleMode = AutoScaleMode.Dpi;
            AutoScaleDimensions = new SizeF(96F, 96F);

            FormClosing += delegate(object sender, FormClosingEventArgs e)
            {
                if (!_running) return;
                DialogResult answer = MessageBox.Show(this,
                    "Сборка ещё идёт. Закрыть окно и прервать её?",
                    Text, MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
                if (answer != DialogResult.Yes) e.Cancel = true;
            };

            BuildUi();

            if (_root == null)
            {
                SetStatus("Не найден проект Aurum рядом с программой", Red);
                Log("Положи AurumVersionBuilder.exe в папку tools внутри проекта Aurum.");
                Log("Искал package.json, src\\lib\\version.ts и android\\app\\build.gradle.");
                _buildButton.Enabled = false;
                _versionButton.Enabled = false;
                return;
            }

            LoadState();
            Shown += delegate { _versionBox.Select(_versionBox.TextLength, 0); };
            SetStatus("Готово к работе", Muted);
            Log("Проект: " + _root);
            Log("Измени версию, при желании отметь Beta — и нажми «Применить и собрать».");
        }

        private void BuildUi()
        {
            Label title = new Label();
            title.Text = "Aurum · сборка версии";
            title.Font = new Font("Segoe UI", 15F, FontStyle.Bold);
            title.ForeColor = Gold;
            title.AutoSize = true;
            title.Location = new Point(20, 14);
            Controls.Add(title);

            Label subtitle = new Label();
            subtitle.Text = "Меняет версию в коде и собирает APK + EXE";
            subtitle.ForeColor = Muted;
            subtitle.AutoSize = true;
            subtitle.Location = new Point(22, 48);
            Controls.Add(subtitle);

            Panel card = new Panel();
            card.Location = new Point(20, 78);
            card.Size = new Size(600, 176);
            card.BackColor = Card;
            card.Paint += CardPaint;
            Controls.Add(card);

            Label versionLabel = MakeCaption("Версия", 16, 14);
            card.Controls.Add(versionLabel);

            _versionBox = new TextBox();
            _versionBox.Location = new Point(16, 38);
            _versionBox.Size = new Size(128, 28);
            _versionBox.BackColor = Bg;
            _versionBox.ForeColor = Fg;
            _versionBox.BorderStyle = BorderStyle.FixedSingle;
            _versionBox.Font = new Font("Consolas", 11F);
            _versionBox.TextChanged += delegate { UpdatePreview(); };
            _versionBox.KeyPress += VersionKeyPress;
            card.Controls.Add(_versionBox);

            _betaBox = new CheckBox();
            _betaBox.Text = "Beta";
            _betaBox.AutoSize = true;
            _betaBox.Location = new Point(158, 40);
            _betaBox.ForeColor = Fg;
            _betaBox.BackColor = Color.Transparent;
            _betaBox.CheckedChanged += delegate { UpdatePreview(); };
            card.Controls.Add(_betaBox);

            Label codeLabel = MakeCaption("versionCode", 234, 14);
            card.Controls.Add(codeLabel);

            _codeBox = new NumericUpDown();
            _codeBox.Location = new Point(234, 38);
            _codeBox.Size = new Size(92, 28);
            _codeBox.Minimum = 1;
            _codeBox.Maximum = 2100000000;
            _codeBox.BackColor = Bg;
            _codeBox.ForeColor = Fg;
            _codeBox.BorderStyle = BorderStyle.FixedSingle;
            _codeBox.Font = new Font("Consolas", 10F);
            card.Controls.Add(_codeBox);

            _preview = new Label();
            _preview.Location = new Point(16, 86);
            _preview.Size = new Size(568, 20);
            _preview.ForeColor = Gold;
            _preview.Font = new Font("Segoe UI", 10.5F, FontStyle.Bold);
            _preview.AutoEllipsis = true;
            card.Controls.Add(_preview);

            Label filesHint = new Label();
            filesHint.Text = "Обновятся: src\\lib\\version.ts · package.json · android\\app\\build.gradle · README.md";
            filesHint.Location = new Point(16, 112);
            filesHint.Size = new Size(568, 18);
            filesHint.ForeColor = Muted;
            filesHint.Font = new Font("Segoe UI", 8.25F);
            card.Controls.Add(filesHint);

            _current = new Label();
            _current.Location = new Point(16, 138);
            _current.Size = new Size(568, 18);
            _current.ForeColor = Muted;
            _current.Font = new Font("Segoe UI", 8.25F);
            card.Controls.Add(_current);

            _buildButton = MakeButton("Применить и собрать", 20, 270, 220, true);
            _buildButton.Click += delegate { Apply(true); };

            _versionButton = MakeButton("Только версия", 250, 270, 160, false);
            _versionButton.Click += delegate { Apply(false); };

            _distButton = MakeButton("Открыть dist", 420, 270, 140, false);
            _distButton.Enabled = false;
            _distButton.Click += delegate { OpenDist(); };

            Label logTitle = MakeCaption("Журнал", 20, 320);
            Controls.Add(logTitle);

            _log = new TextBox();
            _log.Location = new Point(20, 342);
            _log.Size = new Size(600, 212);
            _log.Multiline = true;
            _log.ReadOnly = true;
            _log.ScrollBars = ScrollBars.Vertical;
            _log.BackColor = Bg;
            _log.ForeColor = Color.FromArgb(200, 200, 208);
            _log.BorderStyle = BorderStyle.FixedSingle;
            _log.Font = new Font("Consolas", 8.5F);
            _log.WordWrap = false;
            Controls.Add(_log);

            _status = new Label();
            _status.Location = new Point(20, 564);
            _status.Size = new Size(600, 22);
            _status.ForeColor = Muted;
            _status.Font = new Font("Segoe UI", 8.5F);
            _status.AutoEllipsis = true;
            Controls.Add(_status);

            _progress = new ProgressBar();
            _progress.Location = new Point(20, 594);
            _progress.Size = new Size(600, 6);
            _progress.Style = ProgressBarStyle.Marquee;
            _progress.MarqueeAnimationSpeed = 25;
            _progress.Visible = false;
            Controls.Add(_progress);
        }

        private static Label MakeCaption(string text, int x, int y)
        {
            Label label = new Label();
            label.Text = text;
            label.Location = new Point(x, y);
            label.AutoSize = true;
            label.ForeColor = Muted;
            label.Font = new Font("Segoe UI", 8.25F);
            return label;
        }

        private Button MakeButton(string text, int x, int y, int width, bool primary)
        {
            Button button = new Button();
            button.Text = text;
            button.Location = new Point(x, y);
            button.Size = new Size(width, 38);
            button.FlatStyle = FlatStyle.Flat;
            button.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            button.Cursor = Cursors.Hand;

            if (primary)
            {
                button.BackColor = Gold;
                button.ForeColor = Color.FromArgb(16, 16, 18);
                button.FlatAppearance.BorderSize = 0;
                button.FlatAppearance.MouseOverBackColor = GoldHover;
                button.FlatAppearance.MouseDownBackColor = Gold;
            }
            else
            {
                button.BackColor = Card;
                button.ForeColor = Fg;
                button.FlatAppearance.BorderSize = 1;
                button.FlatAppearance.BorderColor = Line;
                button.FlatAppearance.MouseOverBackColor = Color.FromArgb(32, 32, 36);
                button.FlatAppearance.MouseDownBackColor = Color.FromArgb(24, 24, 28);
            }

            Controls.Add(button);
            return button;
        }

        private void CardPaint(object sender, PaintEventArgs e)
        {
            Control control = (Control)sender;
            using (Pen pen = new Pen(Line))
            {
                e.Graphics.DrawRectangle(pen, 0, 0, control.Width - 1, control.Height - 1);
            }
        }

        private void VersionKeyPress(object sender, KeyPressEventArgs e)
        {
            if (!char.IsControl(e.KeyChar) && !char.IsDigit(e.KeyChar) && e.KeyChar != '.')
            {
                e.Handled = true;
            }
        }

        private void LoadState()
        {
            try
            {
                _state = VersionFiles.Read(_root);
                _versionBox.Text = _state.Short;
                _betaBox.Checked = _state.Beta;
                _codeBox.Value = Math.Min(_codeBox.Maximum, _state.Code + 1);
                UpdateCurrent();
                UpdatePreview();
            }
            catch (Exception ex)
            {
                SetStatus("Не удалось прочитать версию", Red);
                Log("!! " + ex.Message);
            }
        }

        private void UpdateCurrent()
        {
            if (_state == null) return;
            _current.Text = "Сейчас: " + _state.Label + "  ·  versionCode " + _state.Code +
                            "  ·  semver " + _state.Semver;
        }

        private void UpdatePreview()
        {
            if (_root == null) return;

            string error;
            string version = VersionFiles.Normalize(_versionBox.Text, out error);
            if (version == null)
            {
                _preview.Text = error;
                _preview.ForeColor = Red;
            }
            else
            {
                string display = version + (_betaBox.Checked ? " Beta" : "");
                string artifact = "Aurum-" + version + (_betaBox.Checked ? "-Beta" : "");
                _preview.Text = "V" + display + "  ·  " + artifact + ".apk + " + artifact + "-win.exe";
                _preview.ForeColor = Gold;
            }

            bool ready = version != null && !_running;
            _buildButton.Enabled = ready;
            _versionButton.Enabled = ready;
        }

        private void Apply(bool build)
        {
            if (_running || _root == null) return;

            string error;
            string version = VersionFiles.Normalize(_versionBox.Text, out error);
            if (version == null)
            {
                MessageBox.Show(this, error, Text, MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            string display = version + (_betaBox.Checked ? " Beta" : "");
            int code = (int)_codeBox.Value;

            if (code <= _state.Code)
            {
                DialogResult lower = MessageBox.Show(this,
                    "versionCode " + code + " не больше текущего (" + _state.Code + ").\n" +
                    "Android не установит обновление поверх старой версии.\n\nПродолжить?",
                    Text, MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
                if (lower != DialogResult.Yes) return;
            }

            if (build)
            {
                DialogResult confirm = MessageBox.Show(this,
                    "Обновить версию до V" + display + " и собрать APK + EXE?\n\n" +
                    "Сборка занимает несколько минут. Не запускай её одновременно с dev-сервером.",
                    Text, MessageBoxButtons.YesNo, MessageBoxIcon.Question);
                if (confirm != DialogResult.Yes) return;
            }

            try
            {
                ApplyResult result = VersionFiles.Apply(_root, version, _betaBox.Checked, code);
                _state = VersionFiles.Read(_root);

                Log("");
                Log("== Версия обновлена: V" + result.OldDisplay + " → V" + result.Display +
                    " (versionCode " + code + ")");
                if (result.ChangedFiles.Count == 0)
                {
                    Log("   файлы уже содержали эту версию");
                }
                else
                {
                    Log("   изменено: " + string.Join(", ", result.ChangedFiles.ToArray()));
                }

                _codeBox.Value = Math.Min(_codeBox.Maximum, _state.Code + 1);
                UpdateCurrent();
                UpdatePreview();

                if (build)
                {
                    StartBuilds(result.ArtifactBase);
                }
                else
                {
                    SetStatus("Версия обновлена. Сборка не запускалась.", Green);
                }
            }
            catch (Exception ex)
            {
                SetStatus("Ошибка обновления версии", Red);
                Log("!! " + ex.Message);
                MessageBox.Show(this, ex.Message, Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void StartBuilds(string artifact)
        {
            _running = true;
            _buildButton.Enabled = false;
            _versionButton.Enabled = false;
            _progress.Visible = true;
            SetStatus("Сборка APK…", Muted);

            Thread worker = new Thread(new ThreadStart(delegate { BuildWorker(artifact); }));
            worker.IsBackground = true;
            worker.Start();
        }

        private void BuildWorker(string artifact)
        {
            int apkExit = RunCommand("npm.cmd run android:build", "APK");
            if (apkExit != 0)
            {
                Finish(false, "Сборка APK завершилась с ошибкой (код " + apkExit + ").");
                return;
            }

            SetStatus("Сборка EXE…", Muted);
            int exeExit = RunCommand("npm.cmd run win:build", "EXE");
            if (exeExit != 0)
            {
                Finish(false, "Сборка EXE завершилась с ошибкой (код " + exeExit + ").");
                return;
            }

            Finish(true, "Готово: dist\\" + artifact + ".apk и dist\\" + artifact + "-win.exe");
        }

        private int RunCommand(string command, string title)
        {
            Log("");
            Log("== Сборка " + title + ": " + command);

            ProcessStartInfo info = new ProcessStartInfo("cmd.exe", "/c chcp 65001>nul && " + command);
            info.WorkingDirectory = _root;
            info.UseShellExecute = false;
            info.CreateNoWindow = true;
            info.RedirectStandardOutput = true;
            info.RedirectStandardError = true;
            info.StandardOutputEncoding = Encoding.UTF8;
            info.StandardErrorEncoding = Encoding.UTF8;

            Process process = new Process();
            process.StartInfo = info;
            process.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e)
            {
                if (e.Data != null) Log(e.Data);
            };
            process.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs e)
            {
                if (e.Data != null) Log(e.Data);
            };

            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            process.WaitForExit();
            process.WaitForExit();
            return process.ExitCode;
        }

        private void Finish(bool success, string message)
        {
            if (InvokeRequired)
            {
                BeginInvoke(new Action<bool, string>(Finish), success, message);
                return;
            }

            _running = false;
            _progress.Visible = false;
            _distButton.Enabled = success;
            UpdatePreview();
            SetStatus(message, success ? Green : Red);

            Log("");
            Log((success ? "== " : "!! ") + message);

            MessageBox.Show(this, success ? message : message + "\n\nПодробности в журнале.",
                Text, MessageBoxButtons.OK,
                success ? MessageBoxIcon.Information : MessageBoxIcon.Error);
        }

        private void OpenDist()
        {
            string dist = Path.Combine(_root, "dist");
            if (!Directory.Exists(dist))
            {
                SetStatus("Папка dist ещё не создана", Red);
                return;
            }

            Process.Start("explorer.exe", "\"" + dist + "\"");
        }

        private void Log(string message)
        {
            if (InvokeRequired)
            {
                BeginInvoke(new Action<string>(Log), message);
                return;
            }

            _log.AppendText(message + Environment.NewLine);
            _log.SelectionStart = _log.TextLength;
            _log.ScrollToCaret();
        }

        private void SetStatus(string text, Color color)
        {
            if (InvokeRequired)
            {
                BeginInvoke(new Action<string, Color>(SetStatus), text, color);
                return;
            }

            _status.Text = text;
            _status.ForeColor = color;
        }
    }
}
