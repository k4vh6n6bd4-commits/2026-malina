export const mealSuggestions={
 breakfast:[
  {name:"Авокадо, өндөгтэй талх",ingredients:["Өндөг","Авокадо","Бүхэл үрийн талх"],minutes:10,benefit:"Уураг болон эрүүл өөх тосоор хангана."},
  {name:"Жимстэй овъёос",ingredients:["Овъёос","Тараг","Гадил","Жимс"],minutes:8,benefit:"Өглөөг удаан шингэх нүүрс усаар эхлүүлнэ."},
  {name:"Ногоотой омлет",ingredients:["Өндөг","Бууцай","Улаан лооль","Бяслаг"],minutes:12,benefit:"Уураг, ногоог нэг дор авах энгийн сонголт."}
 ],
 lunch:[
  {name:"Тахиа, будаатай аяга",ingredients:["Тахианы цээж мах","Бор будаа","Өргөст хэмх","Лууван"],minutes:25,benefit:"Тэнцвэртэй уураг, нүүрс ус агуулна."},
  {name:"Туна салат",ingredients:["Туна","Навчит ногоо","Эрдэнэ шиш","Улаан лооль"],minutes:10,benefit:"Хөнгөн атлаа уурагтай өдрийн хоол."},
  {name:"Ногоотой гурвалжин будаа",ingredients:["Гурвалжин будаа","Мөөг","Брокколи","Лууван"],minutes:20,benefit:"Эслэгтэй, дулаахан өдрийн сонголт."}
 ],
 snack:[
  {name:"Алим, самрын тос",ingredients:["Алим","Самрын тос"],minutes:3,benefit:"Эслэг, тосны зохистой хослол."},
  {name:"Тараг, жимсний аяга",ingredients:["Тараг","Жимс","Самар"],minutes:5,benefit:"Өдрийн дунд хөнгөн бөгөөд амархан бэлтгэнэ."},
  {name:"Хумустай ногоо",ingredients:["Хумус","Лууван","Өргөст хэмх"],minutes:5,benefit:"Ногооны хэрэглээг нэмэх хялбар зууш."}
 ],
 dinner:[
  {name:"Зууханд болгосон загас",ingredients:["Загас","Төмс","Брокколи","Нимбэг"],minutes:30,benefit:"Уурагтай, тэнцвэртэй оройн хоол."},
  {name:"Тахиатай ногооны шөл",ingredients:["Тахиа","Төмс","Лууван","Сонгино"],minutes:35,benefit:"Дулаахан, зөөлөн оройн сонголт."},
  {name:"Дүпүтэй хуурга",ingredients:["Дүпү","Брокколи","Амтат чинжүү","Будаа"],minutes:20,benefit:"Ургамлын уураг, олон төрлийн ногоотой."}
 ]
};

export const suggestionFor=(type,index=0)=>{
 const options=mealSuggestions[type]||mealSuggestions.breakfast;
 return options[((index%options.length)+options.length)%options.length];
};
