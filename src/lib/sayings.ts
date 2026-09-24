export type SayingKind = "格言" | "故事成語" | "ことわざ";

export interface Saying {
  kind: SayingKind;
  text: string;
  meaning: string;
  /** 格言は人物名、故事成語は出典。 */
  source?: string;
}

export const SAYINGS: Saying[] = [
  // 格言
  { kind: "格言", text: "初心忘るべからず", meaning: "始めた頃の謙虚な気持ちを忘れてはならない。", source: "世阿弥" },
  { kind: "格言", text: "為せば成る 為さねば成らぬ 何事も", meaning: "やればできる。やらなければ何も実現しない。", source: "上杉鷹山" },
  { kind: "格言", text: "やってみせ、言って聞かせて、させてみせ、ほめてやらねば、人は動かじ", meaning: "人を育てるには、手本・説明・実践・称賛が要る。", source: "山本五十六" },
  { kind: "格言", text: "己の欲せざる所は人に施す勿れ", meaning: "自分がされて嫌なことは、人にもしない。", source: "孔子" },
  { kind: "格言", text: "学びて思わざれば則ち罔し", meaning: "学ぶだけで自分で考えなければ、身につかない。", source: "孔子" },
  { kind: "格言", text: "時は金なり", meaning: "時間はお金と同じように貴重なもの。", source: "ベンジャミン・フランクリン" },
  { kind: "格言", text: "知識は力なり", meaning: "知ることが、物事を動かす力になる。", source: "フランシス・ベーコン" },
  { kind: "格言", text: "急がず、休まず", meaning: "焦らず、しかし止まらずに歩み続ける。", source: "ゲーテ" },
  { kind: "格言", text: "人間は考える葦である", meaning: "人は弱い存在だが、考えることに尊さがある。", source: "パスカル" },
  { kind: "格言", text: "天才とは1%のひらめきと99%の努力である", meaning: "成果の大部分は、地道な努力から生まれる。", source: "エジソン" },
  { kind: "格言", text: "一日一生", meaning: "一日を一生のように大切に生きる。", source: "内村鑑三" },
  { kind: "格言", text: "小さいことを積み重ねるのが、とんでもないところへ行くただひとつの道", meaning: "大きな成果は、小さな積み重ねの先にある。", source: "イチロー" },

  // 故事成語
  { kind: "故事成語", text: "温故知新", meaning: "古いことを学び、そこから新しい知識や考えを得る。", source: "論語" },
  { kind: "故事成語", text: "臥薪嘗胆", meaning: "目的を果たすため、長い苦労に耐える。", source: "十八史略" },
  { kind: "故事成語", text: "背水の陣", meaning: "退路を断ち、必死の覚悟で事に当たる。", source: "史記" },
  { kind: "故事成語", text: "蛍雪の功", meaning: "苦労して学問に励んだ成果。", source: "晋書" },
  { kind: "故事成語", text: "人間万事塞翁が馬", meaning: "人生の幸不幸は予測できない。", source: "淮南子" },
  { kind: "故事成語", text: "画竜点睛", meaning: "最後に加える肝心な仕上げ。", source: "歴代名画記" },
  { kind: "故事成語", text: "他山の石", meaning: "他人の誤った言動も、自分を磨く助けになる。", source: "詩経" },
  { kind: "故事成語", text: "五十歩百歩", meaning: "少しの違いはあっても、本質は変わらない。", source: "孟子" },
  { kind: "故事成語", text: "蛇足", meaning: "余計な付け足しで、かえって台無しにすること。", source: "戦国策" },
  { kind: "故事成語", text: "漁夫の利", meaning: "両者が争う隙に、第三者が利益を得る。", source: "戦国策" },
  { kind: "故事成語", text: "呉越同舟", meaning: "仲の悪い者同士が同じ場に居合わせ、協力すること。", source: "孫子" },
  { kind: "故事成語", text: "杞憂", meaning: "あれこれと無用な心配をすること。", source: "列子" },
  { kind: "故事成語", text: "百聞は一見に如かず", meaning: "何度聞くより、一度自分の目で見るほうが確か。", source: "漢書" },
  { kind: "故事成語", text: "過ぎたるは猶及ばざるが如し", meaning: "やりすぎは、足りないのと同じくらいよくない。", source: "論語" },
  { kind: "故事成語", text: "虎穴に入らずんば虎子を得ず", meaning: "危険を冒さなければ、大きな成果は得られない。", source: "後漢書" },
  { kind: "故事成語", text: "大器晩成", meaning: "大人物は、時間をかけて大成する。", source: "老子" },
  { kind: "故事成語", text: "千里の行も足下に始まる", meaning: "どんな大事業も、身近な一歩から始まる。", source: "老子" },
  { kind: "故事成語", text: "良薬は口に苦し", meaning: "ためになる忠告ほど、聞くのがつらい。", source: "孔子家語" },

  // ことわざ
  { kind: "ことわざ", text: "急がば回れ", meaning: "急ぐときほど、確実な方法をとる方が結局早い。" },
  { kind: "ことわざ", text: "継続は力なり", meaning: "続けることが、やがて大きな力になる。" },
  { kind: "ことわざ", text: "塵も積もれば山となる", meaning: "わずかなものでも、積み重なれば大きくなる。" },
  { kind: "ことわざ", text: "石の上にも三年", meaning: "辛抱強く続ければ、いつか報われる。" },
  { kind: "ことわざ", text: "善は急げ", meaning: "良いと思ったことは、すぐに実行する。" },
  { kind: "ことわざ", text: "備えあれば憂いなし", meaning: "準備をしておけば、何が起きても心配ない。" },
  { kind: "ことわざ", text: "七転び八起き", meaning: "何度失敗しても、くじけず立ち上がる。" },
  { kind: "ことわざ", text: "雨降って地固まる", meaning: "もめごとの後は、かえって良い状態になる。" },
  { kind: "ことわざ", text: "案ずるより産むが易し", meaning: "心配するより、やってみると案外たやすい。" },
  { kind: "ことわざ", text: "早起きは三文の徳", meaning: "朝早く起きると、何かしら良いことがある。" },
  { kind: "ことわざ", text: "好きこそ物の上手なれ", meaning: "好きなことは熱心になれるので、上達が早い。" },
  { kind: "ことわざ", text: "失敗は成功のもと", meaning: "失敗から学ぶことで、成功に近づく。" },
  { kind: "ことわざ", text: "笑う門には福来たる", meaning: "いつも笑顔でいる人のところに、幸せがやってくる。" },
  { kind: "ことわざ", text: "情けは人の為ならず", meaning: "人への親切は、巡り巡って自分に返ってくる。" },
  { kind: "ことわざ", text: "転ばぬ先の杖", meaning: "失敗しないよう、前もって用心しておく。" },
  { kind: "ことわざ", text: "能ある鷹は爪を隠す", meaning: "実力のある人は、それをひけらかさない。" },
  { kind: "ことわざ", text: "果報は寝て待て", meaning: "やるべきことをしたら、焦らず結果を待つ。" },
  { kind: "ことわざ", text: "明日は明日の風が吹く", meaning: "先のことを心配しすぎず、なりゆきに任せる。" },
];

/** 日付ごとに決まった1つを返す（同じ日は同じことば）。 */
export function sayingIndexFor(date: Date): number {
  const key = date.getFullYear() * 1000 + date.getMonth() * 40 + date.getDate();
  return (key * 7919) % SAYINGS.length;
}
