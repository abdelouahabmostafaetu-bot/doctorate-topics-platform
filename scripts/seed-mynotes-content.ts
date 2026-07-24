/**
 * سكريبت ملء المحتوى الدراسي — يضيف ملاحظات جاهزة إلى دفاتر «ملاحظاتي»:
 * سلاسل فورييه، التحليل الحقيقي، نظرية الزمر، التوابع المحدبة.
 *
 * - آمن لإعادة التشغيل: يتخطى أي ملاحظة موجودة بنفس العنوان
 * - يطابق الدفاتر الموجودة بالاسم (مرن — يفهم Fouries/Fourier، groupes/groups...)
 *   وينشئ الدفتر إن لم يوجد
 * - لا يلمس أي مجموعة أخرى في mylibrary
 *
 * التشغيل:  npm run seed-notes
 */
import { config } from "dotenv";
config({ path: ".env" });

import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import { MongoClient } from "mongodb";

const url = process.env.DATABASE_URL_MYLIBRARY;
if (!url) {
  console.error("❌ DATABASE_URL_MYLIBRARY غير موجود في .env");
  process.exit(1);
}

const NOTE_COLS = ["notes", "note", "mynotes", "usernotes", "studynotes"];
const NB_COLS = ["notebooks", "notebook", "notefolders"];

type SeedNote = { title: string; content: string };
type Seed = { match: string; notebookTitle: string; notes: SeedNote[] };

// ============================================================
// المحتوى
// ============================================================

const fourier1 = String.raw`## Definition

Let $f$ be $2\pi$-periodic and integrable on $[-\pi, \pi]$. Its **Fourier series** is

$$
Sf(x) = \frac{a_0}{2} + \sum_{n=1}^{\infty} \big( a_n \cos(nx) + b_n \sin(nx) \big)
$$

with coefficients

$$
a_n = \frac{1}{\pi} \int_{-\pi}^{\pi} f(x) \cos(nx)\, dx,
\qquad
b_n = \frac{1}{\pi} \int_{-\pi}^{\pi} f(x) \sin(nx)\, dx.
$$

## Complex (exponential) form

$$
Sf(x) = \sum_{n=-\infty}^{\infty} c_n e^{inx},
\qquad
c_n = \frac{1}{2\pi} \int_{-\pi}^{\pi} f(x) e^{-inx}\, dx.
$$

Relations: $c_0 = a_0/2$, and for $n \ge 1$: $c_n = (a_n - i b_n)/2$, $c_{-n} = (a_n + i b_n)/2$.

## Parity shortcuts

- $f$ **even** $\Rightarrow b_n = 0$ and $a_n = \dfrac{2}{\pi} \displaystyle\int_0^{\pi} f(x)\cos(nx)\,dx$ (cosine series).
- $f$ **odd** $\Rightarrow a_n = 0$ and $b_n = \dfrac{2}{\pi} \displaystyle\int_0^{\pi} f(x)\sin(nx)\,dx$ (sine series).

## Classic expansions (know by heart)

**1)** $f(x) = x$ on $(-\pi, \pi)$:

$$
x = 2 \sum_{n=1}^{\infty} \frac{(-1)^{n+1}}{n} \sin(nx)
$$

**2)** $f(x) = |x|$ on $[-\pi, \pi]$:

$$
|x| = \frac{\pi}{2} - \frac{4}{\pi} \sum_{k=0}^{\infty} \frac{\cos\big((2k+1)x\big)}{(2k+1)^2}
$$

**3)** Square wave $f(x) = \operatorname{sgn}(x)$ on $(-\pi,\pi)$:

$$
\operatorname{sgn}(x) = \frac{4}{\pi} \sum_{k=0}^{\infty} \frac{\sin\big((2k+1)x\big)}{2k+1}
$$

**4)** $f(x) = x^2$ on $[-\pi, \pi]$:

$$
x^2 = \frac{\pi^2}{3} + 4 \sum_{n=1}^{\infty} \frac{(-1)^{n}}{n^2} \cos(nx)
$$

> 💡 Evaluating this at $x = \pi$ gives immediately $\sum 1/n^2 = \pi^2/6$.

## Exam remarks

- **General period $2L$**: replace $nx \to \frac{n\pi x}{L}$ and $\frac{1}{\pi}\int_{-\pi}^{\pi} \to \frac{1}{L}\int_{-L}^{L}$.
- **Decay of coefficients**: the smoother $f$, the faster the decay — if $f \in C^k$ then $c_n = o(n^{-k})$.
- **Riemann–Lebesgue**: for any $f \in L^1$, $a_n, b_n \to 0$.
- Integration term-by-term of a Fourier series is always allowed; differentiation is **not** (needs uniform convergence of the differentiated series).`;

const fourier2 = String.raw`## Dirichlet kernel

The $N$-th partial sum is a convolution:

$$
S_N f(x) = \frac{1}{2\pi} \int_{-\pi}^{\pi} f(x-t)\, D_N(t)\, dt,
\qquad
D_N(t) = \frac{\sin\big((N+\tfrac{1}{2})t\big)}{\sin(t/2)}.
$$

Key facts: $\frac{1}{2\pi}\int_{-\pi}^{\pi} D_N = 1$, but $\|D_N\|_{L^1} \sim \frac{4}{\pi^2}\log N \to \infty$ (this is why pointwise convergence is delicate).

## Dirichlet–Jordan theorem (pointwise)

If $f$ is $2\pi$-periodic and **piecewise $C^1$**, then for every $x$:

$$
S_N f(x) \longrightarrow \frac{f(x^+) + f(x^-)}{2}.
$$

In particular $S_N f(x) \to f(x)$ at every point of continuity, and at a jump the series converges to the **midpoint** of the jump.

## Uniform convergence

- If $f$ is **continuous** and piecewise $C^1$, the convergence is **uniform** on $\mathbb{R}$.
- Sufficient coefficient test: if $\sum (|a_n| + |b_n|) < \infty$, the series converges normally (hence uniformly) and its sum is continuous.

## Fejér's theorem (Cesàro means)

Let $\sigma_N f = \frac{1}{N+1} \sum_{k=0}^{N} S_k f$. The Fejér kernel

$$
K_N(t) = \frac{1}{N+1} \left( \frac{\sin\big(\tfrac{N+1}{2} t\big)}{\sin(t/2)} \right)^{2} \ge 0
$$

is **positive**, and for every continuous $2\pi$-periodic $f$:

$$
\sigma_N f \longrightarrow f \quad \text{uniformly on } \mathbb{R}.
$$

> 💡 Consequence: trigonometric polynomials are dense in $(C_{2\pi}, \|\cdot\|_\infty)$ — Weierstrass approximation follows.

## Gibbs phenomenon

Near a jump discontinuity, $S_N f$ overshoots by about **9%** of the jump size, no matter how large $N$ is (the overshoot moves closer to the jump but never disappears).

## Summary table

| Hypothesis on $f$ | Conclusion |
| --- | --- |
| $f \in L^1$ | $a_n, b_n \to 0$ (Riemann–Lebesgue) |
| piecewise $C^1$ | pointwise → midpoint of jump |
| continuous + piecewise $C^1$ | uniform convergence |
| continuous only | Cesàro (Fejér) uniform; $S_N$ may diverge at points |
| $f \in L^2$ | $S_N f \to f$ in $L^2$ (always) |`;

const fourier3 = String.raw`## Bessel's inequality

For any $f \in L^2(-\pi,\pi)$ (with the trigonometric system):

$$
\frac{a_0^2}{2} + \sum_{n=1}^{N} (a_n^2 + b_n^2) \le \frac{1}{\pi} \int_{-\pi}^{\pi} f(x)^2\, dx
\quad \text{for all } N.
$$

## Parseval's identity

Equality holds in the limit (completeness of the trigonometric system):

$$
\frac{a_0^2}{2} + \sum_{n=1}^{\infty} (a_n^2 + b_n^2) = \frac{1}{\pi} \int_{-\pi}^{\pi} f(x)^2\, dx,
\qquad
\sum_{n=-\infty}^{\infty} |c_n|^2 = \frac{1}{2\pi} \int_{-\pi}^{\pi} |f(x)|^2\, dx.
$$

Equivalently: $S_N f \to f$ in $L^2$ for **every** $f \in L^2$.

## Application 1 — Basel problem

From $x = 2\sum \frac{(-1)^{n+1}}{n}\sin(nx)$: here $b_n = \frac{2(-1)^{n+1}}{n}$, so Parseval gives

$$
\sum_{n=1}^{\infty} \frac{4}{n^2} = \frac{1}{\pi} \int_{-\pi}^{\pi} x^2\, dx = \frac{2\pi^2}{3}
\;\Longrightarrow\;
\boxed{\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}}
$$

## Application 2 — $\zeta(4)$

Apply Parseval to $f(x) = x^2$ (coefficients $a_0 = \frac{2\pi^2}{3}$, $a_n = \frac{4(-1)^n}{n^2}$):

$$
\frac{2\pi^4}{9} + 16 \sum_{n=1}^{\infty} \frac{1}{n^4} = \frac{1}{\pi}\int_{-\pi}^{\pi} x^4 dx = \frac{2\pi^4}{5}
\;\Longrightarrow\;
\boxed{\sum_{n=1}^{\infty} \frac{1}{n^4} = \frac{\pi^4}{90}}
$$

## Application 3 — odd squares

From the series of $|x|$: $\displaystyle\sum_{k=0}^{\infty} \frac{1}{(2k+1)^2} = \frac{\pi^2}{8}$, and from it one recovers $\zeta(2)$ since $\zeta(2) = \frac{4}{3}\cdot\frac{\pi^2}{8}$.

## Exam strategy

1. Compute the Fourier series of the given $f$ (use parity!).
2. **Pointwise value** at a well-chosen $x_0$ (often $0$ or $\pi$) → numeric series via Dirichlet.
3. **Parseval** → the squared series ($\sum 1/n^2 \to \sum 1/n^4$, etc.).
4. Check jump points: the series gives the midpoint, not $f(x_0)$.`;

const real1 = String.raw`## Pointwise vs uniform convergence

$f_n \to f$ **pointwise** on $A$: for each $x$, $f_n(x) \to f(x)$.

$f_n \to f$ **uniformly** on $A$:

$$
\sup_{x \in A} |f_n(x) - f(x)| \longrightarrow 0.
$$

> 💡 In practice: compute (or bound) $M_n = \sup_A |f_n - f|$, often by studying the derivative of $f_n - f$.

## The three exchange theorems

**1) Continuity.** If each $f_n$ is continuous and $f_n \to f$ uniformly, then $f$ is continuous.

**2) Integration.** If $f_n \to f$ uniformly on $[a,b]$ and each $f_n$ is (Riemann) integrable:

$$
\int_a^b f_n \longrightarrow \int_a^b f.
$$

**3) Differentiation.** If each $f_n \in C^1$, $f_n(x_0)$ converges at one point, and $f_n' \to g$ **uniformly**, then $f_n \to f$ uniformly on compacts, $f \in C^1$ and $f' = g$.

⚠️ In (3) the uniformity is needed on the **derivatives**, not on $f_n$.

## Weierstrass M-test (for series)

If $|u_n(x)| \le M_n$ for all $x \in A$ with $\sum M_n < \infty$, then $\sum u_n$ converges **normally**, hence uniformly and absolutely on $A$.

## Dini's theorem

On a **compact** set: if $f_n$ are continuous, $f_n \to f$ pointwise with $f$ continuous, and $(f_n(x))$ is **monotone** in $n$ for each $x$, then the convergence is uniform.

## Classic counterexamples

- $f_n(x) = x^n$ on $[0,1]$: pointwise limit is discontinuous ($0$ then $1$ at $x=1$) → not uniform.
- $f_n(x) = n x e^{-n x^2}$ on $[0,1]$: $f_n \to 0$ pointwise but $\int_0^1 f_n = \frac{1}{2}(1 - e^{-n}) \to \frac{1}{2} \ne 0$ → not uniform.
- $f_n(x) = \frac{\sin(nx)}{\sqrt{n}} \to 0$ uniformly, but $f_n'(x) = \sqrt{n}\cos(nx)$ diverges → uniform convergence does **not** pass to derivatives.

## Checklist for exams

1. Find the pointwise limit $f$.
2. Compute $M_n = \sup |f_n - f|$ (study variations, or evaluate at the max point, often $x_n \to$ boundary).
3. If $M_n \not\to 0$: exhibit $x_n$ with $|f_n(x_n) - f(x_n)| \ge c > 0$.
4. On sub-intervals $[a, 1]$ or $[0, a]$ the convergence may become uniform — always check.`;

const real2 = String.raw`## Darboux sums and integrability

For bounded $f$ on $[a,b]$ and a partition $\sigma$, define lower/upper sums $s(f,\sigma) \le S(f,\sigma)$.

**Riemann integrable** $\iff$ for all $\varepsilon > 0$ there is $\sigma$ with $S(f,\sigma) - s(f,\sigma) < \varepsilon$.

Sufficient classes: **continuous** on $[a,b]$, **monotone**, bounded with finitely many discontinuities, and (Lebesgue's criterion) bounded + continuous almost everywhere.

## Fundamental Theorem of Calculus

**FTC 1.** If $f$ is integrable on $[a,b]$ and $F(x) = \int_a^x f(t)\,dt$, then $F$ is Lipschitz-continuous; at every point where $f$ is continuous, $F'(x) = f(x)$.

**FTC 2.** If $F \in C^1[a,b]$ then $\int_a^b F'(t)\, dt = F(b) - F(a)$.

## Mean value theorems

**First MVT.** $f$ continuous, $g \ge 0$ integrable:

$$
\int_a^b f g = f(c) \int_a^b g \quad \text{for some } c \in [a,b].
$$

## Riemann sums

$$
\frac{b-a}{n} \sum_{k=1}^{n} f\Big(a + k\frac{b-a}{n}\Big) \longrightarrow \int_a^b f
\quad (f \text{ integrable}).
$$

Classic use: $\displaystyle\lim_n \frac{1}{n}\sum_{k=1}^n \frac{1}{1 + k/n} = \int_0^1 \frac{dx}{1+x} = \ln 2$.

## Improper integrals — reference scales

**At infinity:** $\displaystyle\int_1^{\infty} \frac{dx}{x^p}$ converges $\iff p > 1$.

**At $0$:** $\displaystyle\int_0^{1} \frac{dx}{x^p}$ converges $\iff p < 1$.

**Bertrand:** $\displaystyle\int_e^{\infty} \frac{dx}{x^p (\ln x)^q}$ converges $\iff p > 1$, or ($p = 1$ and $q > 1$).

## Convergence tests

- **Comparison / equivalents** for positive functions (equivalents preserve the nature).
- **Absolute convergence** $\Rightarrow$ convergence.
- **Abel/Dirichlet-type**: $\displaystyle\int_1^{\infty} \frac{\sin x}{x^{\alpha}}\, dx$ converges for $\alpha > 0$ (semi-convergent for $0 < \alpha \le 1$, absolutely for $\alpha > 1$).

⚠️ $\int_1^\infty \frac{|\sin x|}{x} dx = +\infty$: convergence $\ne$ absolute convergence.`;

const groups1 = String.raw`## Group — definition

$(G, \cdot)$ is a **group** when: associativity, neutral element $e$, and every $x$ has an inverse $x^{-1}$. **Abelian** if moreover $xy = yx$.

Standard examples: $(\mathbb{Z}, +)$, $(\mathbb{Z}/n\mathbb{Z}, +)$, $((\mathbb{Z}/n\mathbb{Z})^{\times}, \cdot)$, symmetric group $S_n$ ($|S_n| = n!$), dihedral $D_n$ ($|D_n| = 2n$), $GL_n(\mathbb{K})$.

## Subgroup criterion

$H \le G$ $\iff$ $H \ne \varnothing$ and $\forall x, y \in H: x y^{-1} \in H$.

Intersections of subgroups are subgroups; unions are **not** in general ($H \cup K$ is a subgroup iff $H \subseteq K$ or $K \subseteq H$).

## Order of an element, cyclic groups

$\operatorname{ord}(x) = $ smallest $k \ge 1$ with $x^k = e$; then $\langle x \rangle \cong \mathbb{Z}/k\mathbb{Z}$.

- $x^m = e \iff \operatorname{ord}(x) \mid m$.
- Every subgroup of a cyclic group is cyclic.
- $\mathbb{Z}/n\mathbb{Z}$ has exactly one subgroup of order $d$ for each $d \mid n$; number of generators $= \varphi(n)$.
- In $\mathbb{Z}/n\mathbb{Z}$: $\operatorname{ord}(\bar{k}) = \dfrac{n}{\gcd(n,k)}$.

## Cosets and Lagrange's theorem

Left cosets $xH$ partition $G$, all of size $|H|$. Hence, if $G$ is finite:

$$
|G| = [G : H] \cdot |H|
\qquad \Longrightarrow \qquad
|H| \text{ divides } |G|.
$$

**Corollaries:**

1. $\operatorname{ord}(x) \mid |G|$, so $x^{|G|} = e$ for all $x$.
2. Every group of **prime order** $p$ is cyclic $\cong \mathbb{Z}/p\mathbb{Z}$ (no proper nontrivial subgroup).
3. Fermat/Euler: in $(\mathbb{Z}/n\mathbb{Z})^{\times}$, $a^{\varphi(n)} \equiv 1 \pmod n$.

⚠️ The converse of Lagrange is **false**: $A_4$ ($|A_4| = 12$) has no subgroup of order $6$.

## Quick exam facts

- $S_n$ is generated by transpositions; signature $\varepsilon: S_n \to \{\pm 1\}$ is a morphism.
- A group where $x^2 = e$ for all $x$ is abelian (classic exercise).
- $|G| \le 5 \Rightarrow G$ abelian; the smallest non-abelian group is $S_3$ ($|S_3| = 6$).`;

const groups2 = String.raw`## Normal subgroups

$H \trianglelefteq G$ $\iff$ $gHg^{-1} = H$ for all $g$ $\iff$ $gH = Hg$ for all $g$ $\iff$ $H$ is a union of conjugacy classes.

Automatic cases:

- any subgroup of an **abelian** group;
- any subgroup of **index 2** (e.g. $A_n \trianglelefteq S_n$);
- kernels: $\ker \varphi \trianglelefteq G$ for any morphism $\varphi$;
- the center $Z(G) = \{ g : gx = xg\ \forall x \} \trianglelefteq G$.

## Quotient group

If $H \trianglelefteq G$, the set $G/H$ of cosets is a group with $(xH)(yH) = xyH$, and $|G/H| = [G:H]$. The projection $\pi: G \to G/H$ is a surjective morphism with kernel $H$.

## Morphisms

$\varphi: G \to G'$ morphism: $\varphi(xy) = \varphi(x)\varphi(y)$. Then $\varphi(e) = e'$, $\varphi(x^{-1}) = \varphi(x)^{-1}$, and

- $\varphi$ injective $\iff \ker \varphi = \{e\}$;
- images of subgroups are subgroups; preimages of normal subgroups are normal.

## First isomorphism theorem ⭐

For any morphism $\varphi: G \to G'$:

$$
G / \ker \varphi \;\cong\; \operatorname{Im} \varphi.
$$

**How to use it:** to prove $G/H \cong K$, build a surjective morphism $\varphi: G \to K$ with $\ker \varphi = H$. This is almost always the fastest route.

Examples:

- $\det: GL_n(\mathbb{K}) \to \mathbb{K}^{\times}$ gives $GL_n/SL_n \cong \mathbb{K}^{\times}$.
- $\varepsilon: S_n \to \{\pm 1\}$ gives $S_n/A_n \cong \mathbb{Z}/2\mathbb{Z}$.
- $x \mapsto e^{2i\pi x}$ gives $\mathbb{R}/\mathbb{Z} \cong \mathbb{U}$ (unit circle).

## Second and third isomorphism theorems

- If $H \le G$, $N \trianglelefteq G$: $HN/N \cong H/(H \cap N)$.
- If $N \subseteq H$, both normal in $G$: $(G/N)/(H/N) \cong G/H$.

## Useful extras

- $G/Z(G)$ cyclic $\Rightarrow G$ abelian (classic!).
- Conjugacy classes partition $G$; class equation: $|G| = |Z(G)| + \sum [G : C_G(x_i)]$.
- A group is **simple** if its only normal subgroups are $\{e\}$ and $G$; $A_n$ is simple for $n \ge 5$.`;

const convex1 = String.raw`## Definition

$f: I \to \mathbb{R}$ ($I$ an interval) is **convex** when for all $x, y \in I$, $t \in [0,1]$:

$$
f\big(tx + (1-t)y\big) \le t f(x) + (1-t) f(y).
$$

**Strictly convex**: strict inequality for $x \ne y$, $t \in (0,1)$. $f$ **concave** $\iff -f$ convex.

Geometrically: the graph lies **below its chords**; the epigraph $\{(x,y) : y \ge f(x)\}$ is a convex set.

## Slopes lemma (three points) ⭐

If $f$ is convex and $x < y < z$ in $I$:

$$
\frac{f(y)-f(x)}{y-x} \;\le\; \frac{f(z)-f(x)}{z-x} \;\le\; \frac{f(z)-f(y)}{z-y}.
$$

Slopes of chords increase — this little lemma proves almost everything below.

## Regularity (automatic!)

A convex function on an **open** interval is:

- continuous on the interior of $I$;
- left/right differentiable everywhere, with $f'_-(x) \le f'_+(x)$, both nondecreasing;
- locally Lipschitz on compact subsets of the interior.

⚠️ Continuity can fail only at endpoints of a closed interval.

## Characterizations with derivatives

- $f$ differentiable: $f$ convex $\iff$ $f'$ **nondecreasing** $\iff$ the graph lies **above every tangent**:

$$
f(y) \ge f(x) + f'(x)(y - x) \quad \forall x, y \in I.
$$

- $f$ twice differentiable: $f$ convex $\iff f'' \ge 0$ on $I$. ($f'' > 0 \Rightarrow$ strictly convex; converse false: $x^4$.)

## Operations preserving convexity

- Sum, positive multiple; $\max(f, g)$; supremum of any family of convex functions.
- Composition: $g \circ f$ convex if $f$ convex and $g$ convex **nondecreasing** (e.g. $e^{f}$).
- Limits: pointwise limit of convex functions is convex.

## Standard examples

$x^2$, $|x|$, $e^{ax}$, $-\ln x$, $x \ln x$ (on $(0,\infty)$), $x^p$ for $p \ge 1$ on $[0, \infty)$ — all convex; $\ln x$, $\sqrt{x}$ concave.

## Minima

For convex $f$: every local minimum is **global**, and the set of minimizers is an interval. If $f$ is differentiable, $f'(x_0) = 0 \iff x_0$ is a global minimum.`;

const convex2 = String.raw`## Jensen's inequality (finite form) ⭐

$f$ convex, $x_1, \dots, x_n \in I$, weights $\lambda_i \ge 0$ with $\sum \lambda_i = 1$:

$$
f\Big( \sum_{i=1}^n \lambda_i x_i \Big) \le \sum_{i=1}^n \lambda_i f(x_i).
$$

Integral form: for $\varphi$ convex and $g$ integrable on a probability space, $\varphi\big(\int g\big) \le \int \varphi(g)$.

## AM–GM

Apply Jensen to the **concave** $\ln$ with equal weights:

$$
\sqrt[n]{x_1 \cdots x_n} \;\le\; \frac{x_1 + \cdots + x_n}{n},
$$

with equality iff all $x_i$ are equal. Weighted version: $\prod x_i^{\lambda_i} \le \sum \lambda_i x_i$.

## Young's inequality

For $p, q > 1$ conjugate ($\frac{1}{p} + \frac{1}{q} = 1$) and $a, b \ge 0$:

$$
ab \;\le\; \frac{a^p}{p} + \frac{b^q}{q}.
$$

(Proof: weighted AM–GM with weights $1/p, 1/q$ on $a^p, b^q$.)

## Hölder's inequality

$$
\sum_{i} |x_i y_i| \;\le\; \Big( \sum_i |x_i|^p \Big)^{1/p} \Big( \sum_i |y_i|^q \Big)^{1/q},
\qquad
\int |fg| \le \|f\|_p \|g\|_q.
$$

$p = q = 2$ gives **Cauchy–Schwarz**.

## Minkowski's inequality

For $p \ge 1$: $\|f + g\|_p \le \|f\|_p + \|g\|_p$ — the triangle inequality that makes $\|\cdot\|_p$ a norm.

## Comparison of power means

For $r < s$ (with $x_i > 0$):

$$
\Big( \frac{1}{n} \sum x_i^r \Big)^{1/r} \;\le\; \Big( \frac{1}{n} \sum x_i^s \Big)^{1/s}.
$$

Harmonic $\le$ geometric $\le$ arithmetic $\le$ quadratic.

## Exam toolbox

- To prove an inequality with sums/integrals of a convex expression → try **Jensen** first.
- Products with exponents summing to 1 → **weighted AM–GM** or **Hölder**.
- Tangent-line trick: for convex $f$, bound $f(x) \ge f(a) + f'(a)(x-a)$ then sum over the variables.
- Always state the **equality case** (usually all variables equal).`;

// ============================================================
// التوزيع على الدفاتر
// ============================================================

const SEEDS: Seed[] = [
  {
    match: "fouri",
    notebookTitle: "Fourier Series",
    notes: [
      { title: "Fourier Series — Coefficients and Classic Expansions", content: fourier1 },
      { title: "Convergence of Fourier Series (Dirichlet, Fejér, Gibbs)", content: fourier2 },
      { title: "Parseval's Identity — Basel Problem and Applications", content: fourier3 },
    ],
  },
  {
    match: "real",
    notebookTitle: "real analysis",
    notes: [
      { title: "Uniform Convergence — Exchange Theorems and Counterexamples", content: real1 },
      { title: "Riemann Integral — FTC, Riemann Sums, Improper Integrals", content: real2 },
    ],
  },
  {
    match: "group",
    notebookTitle: "Théorie des groupes",
    notes: [
      { title: "Groups — Subgroups, Cyclic Groups and Lagrange's Theorem", content: groups1 },
      { title: "Normal Subgroups, Quotients and Isomorphism Theorems", content: groups2 },
    ],
  },
  {
    match: "convex",
    notebookTitle: "Convex Functions",
    notes: [
      { title: "Convex Functions — Definitions, Slopes Lemma, Characterizations", content: convex1 },
      { title: "Convexity Inequalities — Jensen, AM–GM, Hölder, Minkowski", content: convex2 },
    ],
  },
];

// ============================================================
// التنفيذ
// ============================================================

async function main() {
  const client = new MongoClient(url as string);
  await client.connect();
  const db = client.db();
  const existing = (await db.listCollections().toArray()).map((c) => c.name);

  const nbCol =
    process.env.MYNOTES_NOTEBOOKS_COLLECTION ||
    NB_COLS.find((c) => existing.includes(c)) ||
    "notebooks";
  const noteCol =
    process.env.MYNOTES_NOTES_COLLECTION ||
    NOTE_COLS.find((c) => existing.includes(c)) ||
    "notes";

  console.log(`📚 مجموعة الدفاتر: ${nbCol} · 🗒️ مجموعة الملاحظات: ${noteCol}\n`);

  let added = 0;
  let skipped = 0;

  for (const seed of SEEDS) {
    // ابحث عن الدفتر بمطابقة مرنة للاسم (title أو name)
    let nb = (await db.collection(nbCol).findOne({
      $or: [
        { title: { $regex: seed.match, $options: "i" } },
        { name: { $regex: seed.match, $options: "i" } },
      ],
    })) as { _id: unknown } | null;

    if (!nb) {
      const now = new Date();
      const res = await db.collection(nbCol).insertOne({
        title: seed.notebookTitle,
        createdAt: now,
        updatedAt: now,
      });
      nb = { _id: res.insertedId };
      console.log(`➕ أُنشئ دفتر جديد: ${seed.notebookTitle}`);
    }

    const nbId = String(nb._id);

    for (const note of seed.notes) {
      const dup = await db.collection(noteCol).findOne({ title: note.title });
      if (dup) {
        skipped++;
        console.log(`⏭️  موجودة مسبقًا: ${note.title}`);
        continue;
      }
      const now = new Date();
      await db.collection(noteCol).insertOne({
        title: note.title,
        content: note.content,
        notebookId: nbId,
        pinned: false,
        createdAt: now,
        updatedAt: now,
      });
      added++;
      console.log(`✅ أُضيفت: ${note.title}`);
    }
  }

  console.log(`\n🎉 انتهى: ${added} ملاحظة جديدة · ${skipped} تُخُطيت (موجودة من قبل)`);
  await client.close();
}

main().catch((e) => {
  console.error("❌ خطأ:", e);
  process.exit(1);
});
