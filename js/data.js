/*
 * Каталог магазина. Всё, что нужно поменять для своего магазина
 * (цены, названия, промокоды, фразы на главном экране), лежит здесь.
 */
window.STORE = {
  // Тип иконки: 'block' — изометрический блок (assets/img/blocks), 'item' — предмет 16×16 (assets/textures/item)
  categories: [
    { id: 'all', label: 'Все товары', icon: ['item', 'compass_00'] },
    { id: 'game', label: 'Игра', icon: ['block', 'grass'] },
    { id: 'coins', label: 'Minecoins', icon: ['item', 'emerald'] },
    { id: 'sub', label: 'Подписки и карты', icon: ['item', 'ender_pearl'] }
  ],

  products: [
    {
      id: 'java-bedrock',
      cat: 'game',
      name: 'Java & Bedrock Edition',
      sub: 'Minecraft для ПК',
      badge: 'Хит',
      price: 1990,
      oldPrice: 2490,
      art: ['block', 'grass'],
      tone: '#6cb33f',
      features: [
        'Java Edition: Windows, macOS, Linux',
        'Bedrock Edition: Windows 10/11',
        'Все будущие обновления бесплатно'
      ]
    },
    {
      id: 'starter',
      cat: 'game',
      name: 'Starter Collection',
      sub: 'Игра + стартовый набор',
      price: 2690,
      art: ['block', 'crafting_table'],
      tone: '#c98d4d',
      features: [
        'Java & Bedrock Edition для ПК',
        '700 Minecoins для Marketplace',
        'Скины, миры и текстур-паки'
      ]
    },
    {
      id: 'deluxe',
      cat: 'game',
      name: 'Deluxe Collection',
      sub: 'Максимум контента',
      badge: 'Выгодно',
      price: 3990,
      oldPrice: 4990,
      art: ['block', 'diamond_block'],
      tone: '#4be0d0',
      features: [
        'Java & Bedrock Edition для ПК',
        '3 500 Minecoins для Marketplace',
        'Лучшее предложение для новичков'
      ]
    },
    {
      id: 'minecoins-1720',
      cat: 'coins',
      name: '1 720 Minecoins',
      sub: 'Валюта для Marketplace',
      price: 1190,
      art: ['item', 'emerald'],
      tone: '#17dd62',
      features: [
        'Скины, миры, аддоны и текстур-паки',
        'Работает в Bedrock Edition',
        'Монеты зачисляются на аккаунт Microsoft'
      ]
    },
    {
      id: 'realms-plus',
      cat: 'sub',
      name: 'Realms Plus, 1 месяц',
      sub: 'Свой сервер для друзей',
      price: 490,
      art: ['item', 'ender_pearl'],
      tone: '#8f5fe8',
      features: [
        'Приватный сервер до 10 игроков',
        'Доступ к каталогу Marketplace',
        'Круглосуточно, без настройки'
      ]
    },
    {
      id: 'gift-card',
      cat: 'sub',
      name: 'Подарочная карта 2 000 ₽',
      sub: 'Для друга — на любой товар',
      price: 2000,
      art: ['item', 'cake'],
      tone: '#ff6b8b',
      features: [
        'Код приходит на e-mail мгновенно',
        'Можно переслать одним сообщением',
        'Подойдёт к любому товару магазина'
      ]
    }
  ],

  // Промокоды: код → скидка в процентах
  promos: {
    CREEPER: { percent: 10, label: 'Ссссскидка 10%' }
  },

  // Жёлтая надпись в стиле главного меню игры — каждый раз случайная
  splashes: [
    'Ключ за секунду!',
    'Не копай вниз!',
    'Скидки без ссссс!',
    'Осторожно, лава!',
    'Строй, а не жди!',
    'Теперь ещё блочнее!',
    'Java и Bedrock!',
    'Крипперы не купили!',
    'Ночь близко!'
  ]
};
