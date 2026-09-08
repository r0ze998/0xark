import { CARD_ART_URLS } from './card-art-assets.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';

// Review copy of design/cards/briefs-*.json. Names and identities are verified
// against the live catalog; these visual situations do not add game mechanics.
export const ART_BRIEFS = [
  {
    "id": 1,
    "name": "Squire",
    "faction": "Knight",
    "rarity": "Common",
    "concept": "塩に曇った小盾を磨く、まだ装備の揃わない若い従士。強さの誇示より、守る準備の丁寧さを描く。",
    "silhouette": "短い二つ編み、狭い肩、胸の丸盾でつくる小さな三角形。",
    "motifs": "磨き途中の丸盾、四角結びの象牙色の紐、擦れた革。",
    "continuity": "Knightの青鋼・象牙・盾型アーチを最も簡素に扱う。四角結びの紐は合成先のKnight Champion（8）に引き継ぐ。"
  },
  {
    "id": 2,
    "name": "Guard",
    "faction": "Knight",
    "rarity": "Common",
    "concept": "潮風の入る書庫門を守る実務的な衛兵。使い込まれた装備と動かない姿勢で、従士とは異なる安定感を出す。",
    "silhouette": "角張った頭、水平な肩、縦長の盾による幅広い長方形。",
    "motifs": "真鍮のアーチを持つ大盾、角の修理跡、厚い肩布。",
    "continuity": "Knightの防衛職を生活感で表現する。大盾の真鍮アーチと修理跡をKnight Champion（8）の装備に継承する。"
  },
  {
    "id": 3,
    "name": "Soldier",
    "faction": "Knight",
    "rarity": "Common",
    "concept": "海霧の巡回から戻った痩身の兵士。動きの残る斜めの姿勢で、門に立つGuardと見分けられるようにする。",
    "silhouette": "細い顔、片上がりの肩、短槍と襟布の斜線。",
    "motifs": "雨に濡れた肩当て、締め直す革帯、細い短槍。",
    "continuity": "青鋼と象牙色を維持しつつ、Knight共通の盾形を肩当ての輪郭だけに抑える。特殊な攻撃属性や能力の紋章は描かない。"
  },
  {
    "id": 4,
    "name": "Paladin",
    "faction": "Knight",
    "rarity": "Common",
    "concept": "日々の守備を務める静かな誓約の騎士。派手な聖光ではなく、整えられた装備と穏やかな目線に品位を持たせる。",
    "silhouette": "頭に沿う編み髪、左右に広がる短いマント、胸元で合う手の菱形。",
    "motifs": "閉じた誓約筒、整えた象牙色のマント、盾形の留め金。",
    "continuity": "Commonとして装飾量は抑える。Knightの誓約という視覚的テーマを用い、回復など未実装の能力を示唆しない。"
  },
  {
    "id": 5,
    "name": "Sacrificial Squire",
    "faction": "Knight",
    "rarity": "Common",
    "concept": "従士が自分の誓約札を使い切る瞬間。犠牲は身体の損傷ではなく、燃え尽きた持ち物と決意で示す。",
    "silhouette": "乱れた短髪、細い肩、胸前に水平に差し出した皿。",
    "motifs": "燃え尽きた誓約札、黒い封蝋、薄い煙。",
    "continuity": "実データのburnによるKnight支援を、使い切った物と意志の表現に置き換える。身体の焼却、追加能力、固定のアクション紋章は描かない。"
  },
  {
    "id": 6,
    "name": "Warden",
    "faction": "Knight",
    "rarity": "Uncommon",
    "concept": "浸水区画の重い扉を管理する監守。鍵束と厚い防護襟で、戦闘員とは違う専門職の重さを出す。",
    "silhouette": "厚い襟と丸い肩、大きな顔、胸元にまとまった鍵束。",
    "motifs": "三本の大鍵、潮で曇る真鍮、閉鎖扉のアーチ。",
    "continuity": "Knightの盾アーチを建築と防護襟に広げる。鍵は職能の小道具であり、解錠システムなど新しいゲーム機能の告知にはしない。"
  },
  {
    "id": 7,
    "name": "Crusader",
    "faction": "Knight",
    "rarity": "Uncommon",
    "concept": "嵐に削られた外郭を歩き続ける遠征騎士。旗ではなく折り畳んだ外套と携行具に旅の時間を刻む。",
    "silhouette": "片側だけ被るフード、斜めの外套筒、前に傾く肩。",
    "motifs": "携行する嵐避け外套、層状の肩鎧、擦れた盾形バックル。",
    "continuity": "Uncommonの複雑さは携行具と鎧の構造で表現する。Sentinelの豪華な装飾や紫のマントは使わない。"
  },
  {
    "id": 8,
    "name": "Knight Champion",
    "faction": "Knight",
    "rarity": "Uncommon",
    "concept": "Squireの手仕事とGuardの堅牢さを受け継ぐ合成カード。二人を重ねず、一人の完成された装備に素材の履歴を残す。",
    "silhouette": "片耳を出した短髪、整った台形の肩、盾アーチと結び紐。",
    "motifs": "Squire（1）の四角結び、Guard（2）の盾アーチと修理跡。",
    "continuity": "実レシピ1＋2→8を装備の継承で可視化する。人物の融合や二重の顔は避け、Legendaryとは装飾密度を分ける。"
  },
  {
    "id": 9,
    "name": "Vanguard",
    "faction": "Knight",
    "rarity": "Rare",
    "concept": "仲間の先頭で進路を示す指揮役。大勢の兵や発光エフェクトを使わず、視線と差し出した手で周囲への影響を伝える。",
    "silhouette": "短い刈り髪、段状に広がる肩当て、前に出る大きな手。",
    "motifs": "道を示す手、重なる防衛アーチ、象牙色の指揮帯。",
    "continuity": "他のKnightを強める実パッシブを指揮の身振りとして表す。顔を主役に保ち、追加の兵士や数値・能力ロゴを描かない。"
  },
  {
    "id": 10,
    "name": "Sentinel",
    "faction": "Knight",
    "rarity": "Legendary",
    "concept": "既存Sentinelの人物像を保ち、溺れた書庫を象徴する最後の守り手として描き直す。静かな正面性と緻密な鎧で最高位を示す。",
    "silhouette": "長い波打つ黒髪、左右に張る銀鎧、落ち着いた正面像。",
    "motifs": "銀と古真鍮の彫金、紫の瞳とマント、最奥の盾アーチ。",
    "continuity": "既存legendary/knight.jpgを人物の基準にする。紫はこのLegendaryの識別色として残し、背景と金属の経年表現でDrowned Archiveへ馴染ませる。"
  },
  {
    "id": 11,
    "name": "Peddler",
    "faction": "Merchant",
    "rarity": "Common",
    "concept": "書庫の通路を行き来する年配の行商人。小さく整頓した品と温かな表情で、Merchantの生活の入口をつくる。",
    "silhouette": "丸い顔と頭巾、丸い肩、胸前の浅い商品箱。",
    "motifs": "波形の真鍮角金具、縫い目のある革箱、小さな分銅。",
    "continuity": "Merchantの黄土色・古真鍮・革を庶民的な道具で示す。波形の角金具をMerchant Magnate（18）の装備へ引き継ぐ。"
  },
  {
    "id": 12,
    "name": "Trader",
    "faction": "Merchant",
    "rarity": "Common",
    "concept": "取引を一件ずつ確かめる実務家。行商の箱とは異なる、薄い帳簿と整った身振りを主役にする。",
    "silhouette": "長い結び髪、細い肩、直角に抱える薄い帳簿。",
    "motifs": "対になった真鍮の封印環、四角い革帳簿、巻いた袖。",
    "continuity": "取引の正確さを物の扱いで表現する。対の封印環をMerchant Magnate（18）へ継承し、通貨記号や読める帳簿文字は入れない。"
  },
  {
    "id": 13,
    "name": "Broker",
    "faction": "Merchant",
    "rarity": "Common",
    "concept": "契約をつなぐ若い仲介人。鋭い横目と小さな封印具を中心に、富豪ではない仕事の緊張を描く。",
    "silhouette": "黒い切り揃えたボブ、細い襟、顔の近くに上げた封印具。",
    "motifs": "小さな封印スタンプ、薄い革書類入れ、鋭い折り目。",
    "continuity": "Merchantの封印モチーフを専門道具として扱う。覗き見・特殊契約などの新しい能力を付与する図像にはしない。"
  },
  {
    "id": 14,
    "name": "Merchant",
    "faction": "Merchant",
    "rarity": "Common",
    "concept": "重い荷を取り扱ってきた倉庫商。上等さより、太い腕と傷んだ革の実用性で存在感を出す。",
    "silhouette": "豊かな髭、大きな胴、両腕に横たわる太い帳簿巻き。",
    "motifs": "防水革の帳簿巻き、太い留め金、塩の残る上着。",
    "continuity": "Commonの生活感を守り、豪華な金鎧や玉座は避ける。商業の世界観は読めない道具と物質の質感で示す。"
  },
  {
    "id": 15,
    "name": "Coin Burner",
    "faction": "Merchant",
    "rarity": "Common",
    "concept": "蓄えた価値を使い切る決断。硬貨を大量に散らさず、ひとつの消耗した取引札を静かに見せる。",
    "silhouette": "片側の刈り上げと片側の太い編み髪、胸元で向き合う火箸と小皿。",
    "motifs": "焼けて消耗した円形の取引札、灰皿、短い真鍮の火箸。",
    "continuity": "burnによる自軍BP倍率という実能力を、価値を消費する物の表現として扱う。身体の損傷や新たな通貨・支払機能は示さない。"
  },
  {
    "id": 16,
    "name": "Magnifier",
    "faction": "Merchant",
    "rarity": "Uncommon",
    "concept": "微細な傷を見抜く鑑定の専門家。顔の近くに置く一枚の拡大鏡を、縮小してもわかる強い形にする。",
    "silhouette": "白い短髪、細い高襟、顔横の大きな丸レンズ。",
    "motifs": "丸い鑑定レンズ、摩耗した封印、関節付きの真鍮柄。",
    "continuity": "Merchantの真鍮細工を光学道具へ展開する。カード名を視覚化するだけで、情報公開や鑑定UIなど未実装機能を主張しない。"
  },
  {
    "id": 17,
    "name": "Speculator",
    "faction": "Merchant",
    "rarity": "Uncommon",
    "concept": "不確かな海路に資本を賭ける思索家。抽象的な金融グラフではなく、重りを動かす手と考え込む目線で判断を描く。",
    "silhouette": "細長い顔、緩く結んだ長髪、片上がりの肘と斜めの秤。",
    "motifs": "位置を変える分銅、小さな棹秤、海路用の旅行外套。",
    "continuity": "判断の緊張を表現し、予測市場や価格変動の新ルールを描き加えない。Legendaryの左右対称な大型天秤とは形を分ける。"
  },
  {
    "id": 18,
    "name": "Merchant Magnate",
    "faction": "Merchant",
    "rarity": "Uncommon",
    "concept": "Peddlerの現場感とTraderの管理能力が一つの商いへ成長した姿。最高位のMagnateとは別人として、合成の履歴を装備に残す。",
    "silhouette": "高くまとめた編み髪、構築的な革肩、胸前の大きな帳簿箱。",
    "motifs": "Peddler（11）の波形角金具、Trader（12）の対の封印環。",
    "continuity": "実レシピ11＋12→18を小道具に残す。Magnate（20）の金髪・紫服・金鎧・玉座を転用せず、Uncommonとして明確に区別する。"
  },
  {
    "id": 19,
    "name": "Monopolist",
    "faction": "Merchant",
    "rarity": "Rare",
    "concept": "書庫の流通を一手に束ねる管理者。散らばる富ではなく、多くの封印を一つに束ねた重さで影響力を表す。",
    "silhouette": "滑らかなまとめ髪、高い襟、建築のように幅広い肩、中央の封印束。",
    "motifs": "まとめられた倉庫の封印、重い革の肩衣、一点だけの紫石。",
    "continuity": "Magnateがプールにいる場合の実パッシブとの関係を、中央封印の小さな紫石で視覚的に結ぶ。世界観上の強制徴収など新しいルールは設定しない。"
  },
  {
    "id": 20,
    "name": "Magnate",
    "faction": "Merchant",
    "rarity": "Legendary",
    "concept": "既存Magnateの金髪・青い瞳・紫と金の威厳を維持する。豪奢さを古びた書庫の資材に馴染ませ、商いを統べる象徴的な肖像にする。",
    "silhouette": "大きく流した灰金髪、高い襟、丸く張り出す金の肩鎧、片側の細い天秤。",
    "motifs": "既存の紫石と彫金鎧、紫の皿を持つ天秤、落ち着いた着座。",
    "continuity": "実物のlegendary/merchant.jpgを確認済み。髪形・青眼・紫服・金の高襟と大きな肩鎧・天秤を保つ。金属は古真鍮寄りに馴染ませ、既存画像の外枠や装飾罫線は焼き込まない。"
  },
  {
    "id": 21,
    "name": "Cutthroat",
    "faction": "Pirate",
    "rarity": "Common",
    "concept": "水没した書庫の格子を忍び抜ける若い密航者。刃を振るう瞬間ではなく、結び目を静かに切る手元と横目で警戒する顔で機敏さを描く。",
    "silhouette": "片肩を下げた細い三角形。短い三日月刃と片側へ流れる赤いスカーフで遠目にも判別。",
    "motifs": "三日月形の仕事刃、象牙色の耳飾り、粗い一重結び。",
    "continuity": "Pirate の赤錆色・タール布・縄を基礎形として提示。28 の腰道具に同じ三日月刃と赤布が継承される。固定アクションを示す発光や紋章は描かない。"
  },
  {
    "id": 22,
    "name": "Raider",
    "faction": "Pirate",
    "rarity": "Common",
    "concept": "潮位が上がる前に書物箱を引き揚げる、がっしりした中年の女性船員。引き寄せた鉤と肩に巻いた縄で強引な突破力を表す。",
    "silhouette": "広い肩の逆三角形に、片側の大きな縄の輪。細身の21とは重心と体積を反転。",
    "motifs": "三本爪の鉤、太い縄輪、補修跡の多い雨具。",
    "continuity": "21 と同じ海の仕事道具を重装備化。28 は三本爪と縄輪を引き継ぐため、鉤の形を明瞭にする。"
  },
  {
    "id": 23,
    "name": "Corsair",
    "faction": "Pirate",
    "rarity": "Common",
    "concept": "崩れた回廊の上を渡る若い女性の索具係。片手で高い縄をつかみ、もう片手の短い観測鏡で次の足場を確かめる。",
    "silhouette": "上げた肘と索具が作る細長い三角。短い編み髪と片肩の旗布が風の方向を示す。",
    "motifs": "短い観測鏡、骨の留め具、張った一本の縄。",
    "continuity": "海賊を全員剣士にせず、航行技能で分ける。現場用の短い鏡と軽装を使い、26 の指揮官用航海器具とは格を分ける。"
  },
  {
    "id": 24,
    "name": "Buccaneer",
    "faction": "Pirate",
    "rarity": "Common",
    "concept": "海底回廊に詳しい壮年の潜水回収者。肩に担いだ短い銛と、胸で抱える珊瑚付きの回収壺で海との近さを描く。",
    "silhouette": "丸い壺を抱く低い重心と、肩から斜めに出る短い銛。帽子や長髪を使わず差別化。",
    "motifs": "枝珊瑚、濡れた革、欠けた回収壺。",
    "continuity": "珊瑚と回収物で陣営の環境適応を示す。壺に読める文字や未知の能力を意味するルーンは付けない。"
  },
  {
    "id": 25,
    "name": "Powder Charge",
    "faction": "Pirate",
    "rarity": "Common",
    "concept": "海水を防ぐ黒い封蝋と赤布で包まれた、使い切りの小さな火薬容器。派手な爆発ではなく短い導火線の一点の火と割れ始めた封蝋に不可逆な選択を感じさせる。",
    "silhouette": "低い樽形の塊に短い取手と一本の導火線。人物カードの肩・顔の反復を切る明確な物体シルエット。",
    "motifs": "黒い封蝋、赤い巻布、消えそうな火点。",
    "continuity": "実名と Burn 能力に合わせた消耗物。全体攻撃の表現を爆発被害や流血にせず、消費前の緊張にとどめる。FLAME などの固定アクション印は描かない。"
  },
  {
    "id": 26,
    "name": "Privateer",
    "faction": "Pirate",
    "rarity": "Uncommon",
    "concept": "古い通行権を盾に封鎖を抜ける、痩身の中年男性の船長。傷んだ正装と胸元の航海器具で、船員より上の専門性を出す。",
    "silhouette": "細い三角帽と高い襟の縦長像。華美な肩鎧ではなく細身の正装で役職を示す。",
    "motifs": "閉じた航海用コンパス、封蝋付きの許可巻紙、擦れた真鍮飾緒。",
    "continuity": "航海器具は Pirate の実用品として直線的にまとめ、Scholar の同心円儀器とは造形を分ける。Common より整った装備だが Legendary の大きな装飾鎧は使わない。"
  },
  {
    "id": 27,
    "name": "Freebooter",
    "faction": "Pirate",
    "rarity": "Uncommon",
    "concept": "冠水した武器庫を独力で渡る褐色肌の壮年女性。片肩の珊瑚状の回収鎧と胸を横切る短い両端鉤で、自作装備の荒々しさを出す。",
    "silhouette": "左右差の大きい肩装備に、胸の横棒。縦長の26、斜線の24と構図を変える。",
    "motifs": "珊瑚の肩当て、短い両端鉤、太い一本編み。",
    "continuity": "24 の海底回収文化を自作装備へ発展させる。Rare の巨大さや殺傷結果を使わず、専門道具と自立した姿勢で Uncommon を区別する。"
  },
  {
    "id": 28,
    "name": "Pirate Quartermaster",
    "faction": "Pirate",
    "rarity": "Uncommon",
    "concept": "Cutthroat の身軽な仕事道具と Raider の引き揚げ装備を束ねる補給責任者。人間同士の融合姿ではなく、二つの技能を引き継いだ完成形として描く。",
    "silhouette": "太いハーネスと片肩の縄輪で安定した三角。胸前の鉤・刃・札を一塊にまとめ、道具の散乱を防ぐ。",
    "motifs": "21 の三日月刃と赤スカーフ、22 の三本爪と縄輪、無文字の補給札。",
    "continuity": "実レシピ 21 + 22 → 28 の視覚的継承。装備の形を素材カードと一致させる。進化を別の超能力や肉体融合として表現しない。"
  },
  {
    "id": 29,
    "name": "Dreadnaught",
    "faction": "Pirate",
    "rarity": "Rare",
    "concept": "船首のような重い肩装備で通路を塞ぐ、白髪の老将。勝利の後まで残る威圧感を、裂けた赤い旗布と背後の無人の回廊で示す。",
    "silhouette": "低い視点から見る船首型の巨大な逆三角。白髪の小さい明部と太い縦の剣で読み取れる。",
    "motifs": "船首形の鎧、裂けた旗布、白髪、くすんだ珊瑚。",
    "continuity": "Rare の圧力を人物の大きさと静止で表現。撃破に連動する実パッシブは残火程度に示唆し、29 自体を船や新しい機械兵器へ置き換えない。"
  },
  {
    "id": 30,
    "name": "Marauder",
    "faction": "Pirate",
    "rarity": "Legendary",
    "concept": "既存の赤毛の剣士を陣営の象徴として再描画する。大きく流れる髪、装飾肩鎧、挑むような目線を残し、海風と潮を受けた書庫の征服者へつなぐ。",
    "silhouette": "片側へ大きく流れる赤い長髪、翼状の肩鎧、胸の斜めの剣。既存画像の特徴を保った唯一の華やかな大三角。",
    "motifs": "赤い長髪、湾曲した真鍮の肩装飾、深紅紫のマント、優雅な剣。",
    "continuity": "solana/client/public/img/cards/legendary/pirate.jpg を人物参照の正とする。顔立ち・髪色・剣士の姿を維持し、背景と素材を現行世界へ統一する。"
  },
  {
    "id": 31,
    "name": "Apprentice",
    "faction": "Scholar",
    "rarity": "Common",
    "concept": "濡れた頁を一枚ずつ救う若い書庫見習い。大きめの作業衣と手持ちの丸い拡大鏡に、まだ身についていない仕事への集中を表す。",
    "silhouette": "大きめの丸い袖、短いボブ、片手の小さな円。細身でも肩を水平にして Pirate の三角と分ける。",
    "motifs": "飾りのない丸い手持ちレンズ、薄い象牙色の一枚紙、紫の作業袖。",
    "continuity": "Scholar の円形道具を最も簡素な形で導入。38 へ手持ちレンズの真鍮輪と紫の袖を引き継ぐ。頁は読める本文を持たない。"
  },
  {
    "id": 32,
    "name": "Archivist",
    "faction": "Scholar",
    "rarity": "Common",
    "concept": "潮に濡れた記録を巻き直す、中年の書庫管理者。円筒の収納容器と二本の平たい索引ひもで整理の仕事を表す。",
    "silhouette": "丸めた肩と胸の太い円筒。袖をまくった両腕が楕円をつくり、31 の小さなレンズと差を出す。",
    "motifs": "太い真鍮の巻物筒、二本の平たい索引ひも、巻き直した羊皮紙。",
    "continuity": "記録を扱う実務者として描く。38 は同型の円筒と二本の索引ひもを継承し、素材が見て取れるようにする。"
  },
  {
    "id": 33,
    "name": "Mage",
    "faction": "Scholar",
    "rarity": "Common",
    "concept": "海霧に残る記録の痕跡を、小さな円環の間で調べる成人の研究者。魔法の大演出ではなく実験中の集中を中心にする。",
    "silhouette": "首元の細い縦線と顎の横顔、胸の二重円。長い杖や尖り帽子を避ける。",
    "motifs": "入れ子の小円環、紙色の細い肩布、ごく薄い霧の糸。",
    "continuity": "31・32 と同じ地に足のついた Common。魔法は世界の記録を観察する小現象に限定し、実装されていない能力や固定 VOID 印を示さない。"
  },
  {
    "id": 34,
    "name": "Sage",
    "faction": "Scholar",
    "rarity": "Common",
    "concept": "潮の音と古い記録を照合する高齢女性。低くまとめた白髪、半月眼鏡、膝から持ち上げた折り畳み図で、静かな経験の厚みを描く。",
    "silhouette": "低い丸髷、丸い肩掛け、下辺を広げる折り畳み図。硬い装備や背の高い頭飾りは使わない。",
    "motifs": "半月眼鏡、折り目のある図紙、擦り切れた紫の肩掛け。",
    "continuity": "年齢や知恵をレアリティと同一視せず、Common の熟練生活者として描く。39 の超常的な洞察とは光量と道具の規模を分ける。"
  },
  {
    "id": 35,
    "name": "Burning Tome",
    "faction": "Scholar",
    "rarity": "Common",
    "concept": "閉じた記録を一度だけ明らかにする代わりに、自らを失う古書。焦げた頁の隙間に、星のような紙粉と薄い光が現れる瞬間を描く。",
    "silhouette": "開いた本の低い翼形。中央の背と丸まった二枚の頁を明瞭にし、火柱で輪郭を隠さない。",
    "motifs": "焦げた象牙色の頁、外れた真鍮の留め具、少数の火粉と円形の記録痕。",
    "continuity": "実名 Burning Tome と手札公開の Burn 能力を、代償を伴う知の開示として表現。固定アクションや目の UI アイコンを絵に焼き込まない。25 とは容器の形と火の扱いを変える。"
  },
  {
    "id": 36,
    "name": "Diviner",
    "faction": "Scholar",
    "rarity": "Uncommon",
    "concept": "潮だまりの反射を読み取る中年女性の観測者。顔の近くまで持ち上げた浅い水盤と、波紋に重ねる細い輪で専門性を表す。",
    "silhouette": "頭布の滑らかな輪郭、横顔、胸の浅い半円の水盤。下が広がるローブを主役にしない。",
    "motifs": "浅い真鍮の水盤、吊られた細い円環、波紋の反射。",
    "continuity": "Scholar の円を液体と観測へ展開。水は現行世界の潮と結びつけ、STORM の固定属性表現にはしない。"
  },
  {
    "id": 37,
    "name": "Arcanist",
    "faction": "Scholar",
    "rarity": "Uncommon",
    "concept": "水没した装置の構造を解読する、短い銀髪の壮年男性。細い肩の上に小型の分解円盤を置き、精密な指先で調整する。",
    "silhouette": "細身の直立像に、左右の指先が作る横長の楕円。短髪と詰めた襟で36・38と分ける。",
    "motifs": "分解した三重円盤、片手だけの暗い手袋、調整用の薄いレンズ。",
    "continuity": "Engineer の製作・動力装置ではなく、記録を読む光学道具として描く。専門性は機構の精度で表現し、大きなオーラや身体変容を足さない。"
  },
  {
    "id": 38,
    "name": "Scholar Lorekeeper",
    "faction": "Scholar",
    "rarity": "Uncommon",
    "concept": "見習いの観察眼と管理者の保存技術を一つにした記録継承者。胸元のレンズと巻物筒を重ね、読み解くことと守ることを同じ姿にする。",
    "silhouette": "端正な低い結び髪と、胸で重なるレンズの円・巻物筒の円柱。二本の白いひもが縦の識別線になる。",
    "motifs": "31 の素朴な真鍮レンズ、32 の巻物筒と二本の索引ひも、継ぎ直した紫の袖。",
    "continuity": "実レシピ 31 + 32 → 38 に対応。二つの道具と素材を継承し、人物の肉体融合にはしない。Legendary の Oracle と区別するため単眼鏡・装飾肩鎧・豪華な本は使わない。"
  },
  {
    "id": 39,
    "name": "Seer",
    "faction": "Scholar",
    "rarity": "Rare",
    "concept": "幾重もの記録の痕跡を重ねて読む、白い三つ編みの高齢女性。三層の薄い円形記録板が一つの像へ重なる瞬間を、静かな権威として描く。",
    "silhouette": "幅のある丸い外套と一本の白い三つ編み。背後の欠けた大円、胸の小さな三層円で格を出す。",
    "motifs": "三枚の薄い記録円板、重なって強まる輪郭、白い編み髪。",
    "continuity": "実パッシブの自分の stat imprint 最大3件による強化を、三層の記録が重なる意匠として示唆。カード数値や未実装の予知結果を描かない。"
  },
  {
    "id": 40,
    "name": "Oracle",
    "faction": "Scholar",
    "rarity": "Legendary",
    "concept": "既存の若い黒髪の読書家を、沈んだ書庫の中枢にいる象徴的人物として継承する。単眼鏡越しの視線と装飾本を中心に、知識を扱う静かな強さを描く。",
    "silhouette": "ふくらみのある黒髪、丸い単眼鏡、装飾肩鎧、胸に斜めに抱えた本。既存の顔・道具の関係を保つ。",
    "motifs": "鎖付きの単眼鏡、装飾本、真鍮縁の肩鎧、深い藍紫の布。",
    "continuity": "solana/client/public/img/cards/legendary/scholar.jpg を人物参照の正とする。若さ・黒髪・単眼鏡・装飾本を守り、既存の美麗な線画から連続した表現にする。"
  },
  {
    "id": 41,
    "name": "Novice",
    "faction": "Monk",
    "rarity": "Common",
    "concept": "潮水のしずくを浅い祈り鉢で受ける若い修道者。偉大な力より、日々の小さな務めと慎重な手つきを描く。",
    "silhouette": "丸い短髪、低い肩、胸前の横長の鉢で、小さく閉じた楕円形をつくる。",
    "motifs": "縁に欠けのある浅い象牙色の祈り鉢。48の継承要素となる。",
    "continuity": "Monk共通のセージ色の粗布、丸い道具、風化した石を使う。華美な後光や金属鎧を持たせずCommonの生活感を保つ。"
  },
  {
    "id": 42,
    "name": "Initiate",
    "faction": "Monk",
    "rarity": "Common",
    "concept": "風に揺れる二重の石珠を結び直し、自分の務めを引き受けた修道者。Noviceの内向きな姿に対し、正面に立つ落ち着きを持たせる。",
    "silhouette": "短く刈った頭と水平な肩布。胸元の大小二重の輪がNoviceの横長の鉢と区別される。",
    "motifs": "中央で結ばれた大小二重の祈り石の輪。48のもう一方の継承要素。",
    "continuity": "素材はNoviceと共有し、衣服の面積や装飾量は増やしすぎない。行動属性のBarrierを盾アイコンとして固定しない。"
  },
  {
    "id": 43,
    "name": "Acolyte",
    "faction": "Monk",
    "rarity": "Common",
    "concept": "湿った廊下で小さな祈り灯を整える奉仕者。外套の大きなフードの中に、明るい顔と手元をまとめる。",
    "silhouette": "大きな円形フード、斜めに傾けた頭、小さな両手のくぼみ。",
    "motifs": "丸く削られた石の灯皿と短い芯切り。小さな生活の灯りであり攻撃魔法ではない。",
    "continuity": "炎を陣営の主役にせず、Monkの海泡色・象牙色・石の丸みを優先する。Scholarの書物やEngineerの機構と重ねない。"
  },
  {
    "id": 44,
    "name": "Disciple",
    "faction": "Monk",
    "rarity": "Common",
    "concept": "潮に削られた回廊で、身体と重心を整える修行者。強さを大きな武器ではなく、踏ん張る体幹と開いた手で示す。",
    "silhouette": "厚い肩から腰へ絞る台形、片側だけ前へ出した開いた掌。鎧や長い武器を使わず力強さを出す。",
    "motifs": "摩耗した前腕の布巻きと丸い石の重り。",
    "continuity": "Knightの防具とは異なる粗布と身体の重心を見せる。Commonの道具は扱える大きさに限定する。"
  },
  {
    "id": 45,
    "name": "Mantra Burner",
    "faction": "Monk",
    "rarity": "Common",
    "concept": "仲間を守るために蓄えた祈願紙を使い切る係。失われるのは紙と蓄えで、人の身体を燃やす描写にはしない。",
    "silhouette": "細い顔、垂れる袖、胸元に水平に据えた大きな石鉢。空になった紙束の紐を手首に残す。",
    "motifs": "燃え尽きる無文字の祈願紙と空の束紐。資源を使い切って仲間へ託す固有能力の方向を示す。",
    "continuity": "Burn能力の視覚的な代償を紙の消費に置く。戦闘で選ぶFLAMEなどの行動とは結び付けない。暖色の占有は小さく保つ。"
  },
  {
    "id": 46,
    "name": "Devotee",
    "faction": "Monk",
    "rarity": "Uncommon",
    "concept": "嵐の夜も沈黙の務めを続ける巡礼者。重ねた実用布と一つの大きな祈り石で、生活者から専門家への深まりを表す。",
    "silhouette": "背の高い頭部、厚い丸襟、胸を覆う一枚の楕円石。低く横に広いNoviceとは縦の比率を変える。",
    "motifs": "何度も補修された石の運搬布と、表面だけが手で磨かれた祈り石。",
    "continuity": "装飾を増やす代わりに道具の重さ、布の重なり、修繕の時間でUncommonを表現する。"
  },
  {
    "id": 47,
    "name": "Contemplator",
    "faction": "Monk",
    "rarity": "Uncommon",
    "concept": "水面に触れずに揺れを見つめる瞑想者。閉じた目だけに頼らず、波紋を観察する静かな鋭さを持たせる。",
    "silhouette": "高い折り襟、細い首、胸前の真円。Devoteeの縦長で重い石とは薄い円盤で区別する。",
    "motifs": "浅い水を張った黒緑色の石鏡と、消えかけの一つの波紋。",
    "continuity": "Scholarの占術具と区別し、星図や文字を描かず身体・水・石の観察に集中する。超常的な色の発光は抑える。"
  },
  {
    "id": 48,
    "name": "Monk Ascender",
    "faction": "Monk",
    "rarity": "Uncommon",
    "concept": "Noviceの祈り鉢とInitiateの二重の石珠を受け継いだ、二つの務めを担う修道者。進化を浮遊や過剰な光でなく、姿勢の完成として示す。",
    "silhouette": "なだらかな丸い肩布と、中心に集まる鉢と二重輪。地面に根を下ろす垂直軸をつくる。",
    "motifs": "41の欠けた浅鉢と42の結び合わされた二重の石珠を、欠け・結び目ごと残す。",
    "continuity": "実際の合成レシピ41＋42の形を明確に継承する。別人物への継承表現であり、LegendaryのAsceticと同一人物にはしない。"
  },
  {
    "id": 49,
    "name": "Elder",
    "faction": "Monk",
    "rarity": "Rare",
    "concept": "長い年月の損失を引き受けてきた長老。割れた祈り鐘を静かに抱え、場全体の音が吸い込まれるような存在感をつくる。",
    "silhouette": "白い巻き毛の丸い頭、横に広い厚い肩布、逆釣鐘の道具。少ない大形で遠目の格を出す。",
    "motifs": "修復せず抱え続ける割れた祈り鐘。失われた後にも相手へ影響が残る固有能力を、静けさの余韻へ翻訳する。",
    "continuity": "死や破壊を人体の損傷で描かず、割れた道具と余韻で示す。豪華な王冠ではなく年齢と場の大きさでRareをつくる。"
  },
  {
    "id": 50,
    "name": "Ascetic",
    "faction": "Monk",
    "rarity": "Legendary",
    "concept": "既存の長い白髪と静かな眼差しを持つAsceticを、嵐の中心でも揺れない修道院の象徴として再解釈する。人物の同一性は残し、舞台と素材を現在の世界観に合わせる。",
    "silhouette": "既存の長い白髪、持ち上がった肩の輪郭、一本の垂直な杖を維持する。髪が外へ流れても顔と杖は中央に残す。",
    "motifs": "細い儀礼杖、象牙色の長髪、小さく残した紫の宝石。背後には摩耗した丸い祈り石の構造を置く。",
    "continuity": "元絵の顔立ち・髪・杖・肩の輪郭を人物識別の軸にする。陣営色変更で完全な別人にせず、旧来の紫は個人的な遺品として小面積だけ残す。"
  },
  {
    "id": 51,
    "name": "Tinkerer",
    "faction": "Engineer",
    "rarity": "Common",
    "concept": "漂着した部品を掌の工具で測り、小さな潮力機構を組み直す若い修繕屋。大発明より、手元を覗き込む好奇心を主役にする。",
    "silhouette": "短く跳ねた髪、前に傾いた頭、小さく閉じた肘。胸前の二股のノギスで識別する。",
    "motifs": "二股の真鍮ノギスと、角の欠けた小さな銅のラチェット外殻。58へ継承する。",
    "continuity": "Engineer共通の銅の緑青、黒鉛色の作業布、角ばった機構を導入する。現代電動工具や大量の細かい歯車は避ける。"
  },
  {
    "id": 52,
    "name": "Mechanic",
    "faction": "Engineer",
    "rarity": "Common",
    "concept": "潮の逆流に備えて手動の留め具を締める整備工。Tinkererより頑丈な体格と工具の長い対角線で区別する。",
    "silhouette": "四角い頭部、厚い前腕、斜めに渡る角形の工具。小さなTinkererより幅と重心を下げる。",
    "motifs": "四角い輪郭のラチェットキーと歯止め式の弁継手。58の大きな機構へ継承する。",
    "continuity": "力は身体と手動機構で表し、Commonに大きな外骨格を持たせない。銅の摩耗した縁と緑青を共通素材にする。"
  },
  {
    "id": 53,
    "name": "Forger",
    "faction": "Engineer",
    "rarity": "Common",
    "concept": "一枚の鋼材に確かな形を与える鍛造職人。Forge Workerの炉へ捧げる行為と区別し、叩く直前の職人の判断を描く。",
    "silhouette": "短い編み髭、片側に立つ角槌、横へ張る肘。腕の形でMechanicの斜め工具と区別する。",
    "motifs": "四角い槌頭と、製作途中の一枚の折れ曲がった金属支持具。",
    "continuity": "実用品を作る姿に留め、炉の巨大さでは格付けしない。熱源は工房の環境でありカードの行動属性を固定しない。"
  },
  {
    "id": 54,
    "name": "Inventor",
    "faction": "Engineer",
    "rarity": "Common",
    "concept": "小型の潮流測定器を初めて回す発明家。完成された権威ではなく、試行錯誤の継ぎはぎと期待の表情を見せる。",
    "silhouette": "縦に細い体、左右で違う肩の高さ、胸上の四角い治具。三枚羽根をひとつの記憶点にする。",
    "motifs": "継ぎ足した銅の角枠に収まる三枚羽根の小型潮流ローター。",
    "continuity": "Architectの丸眼鏡・豊かな灰髪・完成された金属肩を使わない。小さな試作品と未完成の衣服でCommonに留める。"
  },
  {
    "id": 55,
    "name": "Forge Worker",
    "faction": "Engineer",
    "rarity": "Common",
    "concept": "仲間の装備へ最後の出力を送るため、保存していた炉心材を投入する作業者。Burnの代償は消費される炉心材に置く。",
    "silhouette": "丸い坊主頭に跳ね上げた角形バイザー、裾の短い四角い防熱ケープ。手前の炉心材を大きくする。",
    "motifs": "最後の琥珀色の炉心材と空の保管枠。仲間のために蓄えを使い切る不可逆性を示す。",
    "continuity": "55のBurnによるEngineer支援を、炉心材の消費と周囲へ渡る熱で表現する。53は造形作業、55は蓄えの投入として区別する。"
  },
  {
    "id": 56,
    "name": "Schematic",
    "faction": "Engineer",
    "rarity": "Uncommon",
    "concept": "人物ではなく、潮力設備の仕組みを立体で記録する携行式の設計具。細かな紙の図面より、折り畳み機構そのものを収集したくなる対象にする。",
    "silhouette": "中央が高い三面の折り畳み箱と左右の角形アーム。人物の頭や肩と一目で違う輪郭にする。",
    "motifs": "紙に文字を描かず、潮汐エンジンの立体断面を保存した機械模型。象牙色の浮きが視線の中心。",
    "continuity": "既存カード名Schematicを変更せず器物として多様性をつくる。Engineerの計測・潮力・銅の素材を人物カードと共有する。"
  },
  {
    "id": 57,
    "name": "Constructor",
    "faction": "Engineer",
    "rarity": "Uncommon",
    "concept": "浸水した書庫の梁を組み直す建設技師。職人から一段広い仕事を、身体に沿う実用的な作業外骨格で表す。",
    "silhouette": "肩から立つ二本の角形支持枠と、片側へ斜めに渡る石材。人間の胴の外側へ一段だけ輪郭を拡張する。",
    "motifs": "身体の動きに沿う銅の昇降枠と大きな一個の締具。",
    "continuity": "重機に乗る操縦者ではなく、人が手で制御する補助機構を描く。59の非人間的な巨大機体と規模を明確に分ける。"
  },
  {
    "id": 58,
    "name": "Engineer Forgemaster",
    "faction": "Engineer",
    "rarity": "Uncommon",
    "concept": "Tinkererの精度とMechanicの確かな整備を一体化した技師。合成元の工具を、大きなひとつの校正機構へ組み込む。",
    "silhouette": "整った短い髪、片側の角形肩枠、胸元に横長の校正治具。57ほど外側へ広がらず精密さを見せる。",
    "motifs": "51の二股ノギスと52の四角いラチェットキーを合体し、欠けや歯止めの形を残す。",
    "continuity": "実際の合成レシピ51＋52の器具を識別できる大きさで継承する。Forgeという名前でも55の資源投入や53の槌作業を繰り返さない。"
  },
  {
    "id": 59,
    "name": "Colossus",
    "faction": "Engineer",
    "rarity": "Rare",
    "concept": "潮力設備そのものが起き上がった巨大な建造機。少数の大きな機構と接続口によって、仲間の機械を支える陣営全体の存在感を示す。",
    "silhouette": "極端に幅広い四角い肩、小さく奥まった頭、斜めの巨大腕。Constructorの人間らしい肩と顔を残さない。",
    "motifs": "三つの機械的接続口が集まる胸のはずみ車。仲間のEngineerが揃うほど力を増す固有能力に呼応する。",
    "continuity": "機体を大量の細かい歯車や現代ロボット顔にしない。59は陣営の巨大な道具、60はそれを設計する人物として主役を分ける。"
  },
  {
    "id": 60,
    "name": "Architect",
    "faction": "Engineer",
    "rarity": "Legendary",
    "concept": "既存の豊かな灰髪、丸眼鏡、余裕のある微笑みを持つArchitect。海に抗う書庫の構造を掌で読む、技師陣営の象徴にする。",
    "silhouette": "豊かな波打つ長髪、小さな丸眼鏡、丸く張った金属肩の既存輪郭を維持する。手元の角形測定具がEngineerの線を補う。",
    "motifs": "丸眼鏡と測量用の大きな開きノギス。背後の潮力構造と同じ曲率が肩の装飾に反復する。",
    "continuity": "元絵の灰髪・眼鏡・微笑み・肩の形を保存する。新しい陣営色は素材と照明から導入し、紫の襟を個人的な継承要素として少量残す。"
  }
];

export function cardArtUrl(id) {
  if (!Number.isInteger(id) || !CARD_ART_URLS[id]) throw new RangeError(`Unknown card art ID: ${id}`);
  return CARD_ART_URLS[id];
}
